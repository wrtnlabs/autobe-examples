export namespace ICommunityPlatformCommunityModeratorPassword {
  /** Password change request for authenticated community moderator. */
  export type IUpdate = {
    /** Current credential for verification. */
    current_password: string;

    /** New credential to set after validation. */
    new_password: string;
  };
}
