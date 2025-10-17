export namespace IEconDiscussVerifiedExpertEmailVerify {
  /**
   * Verification request carrying the email verification token.
   *
   * On successful validation, the backend flips
   * econ_discuss_users.email_verified (Boolean) to true for the associated
   * account and updates the updated_at timestamp as defined in the Prisma
   * schema.
   */
  export type ICreate = {
    /**
     * Opaque verification token delivered to the user via email.
     *
     * The server validates this token and, on success, updates
     * econ_discuss_users.email_verified to true and touches
     * econ_discuss_users.updated_at per schema.
     */
    token: string;
  };
}
