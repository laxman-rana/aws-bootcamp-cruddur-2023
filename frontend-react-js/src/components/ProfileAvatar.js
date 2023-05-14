
export default function ProfileAvatar(props) {
  const backgroundImage = `url("https://assets.laxmanrana.xyz/avatars/processed/data.jpg")`;
  const styles = {
    backgroundImage: backgroundImage,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div 
      className="profile-avatar"
      style={styles}
    ></div>
  );
}