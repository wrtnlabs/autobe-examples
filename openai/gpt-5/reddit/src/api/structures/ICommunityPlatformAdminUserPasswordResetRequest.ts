export namespace ICommunityPlatformAdminUserPasswordResetRequest {
  /**
   * Admin password reset request payload (initiation).
   *
   * Identifies the administrator by either email or username and triggers
   * issuance of a one-time reset artifact out-of-band (e.g., email link).
   * This request does not change credentials; it only begins the reset flow.
   * Implementations must respond neutrally regardless of lookup outcome and
   * may record audit timestamps on community_platform_users.
   */
  export type ICreate = any | any;
}
