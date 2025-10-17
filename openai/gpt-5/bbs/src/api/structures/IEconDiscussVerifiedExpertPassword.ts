import { tags } from "typia";

export namespace IEconDiscussVerifiedExpertPassword {
  /**
   * Change password for an authenticated verified expert.
   *
   * This DTO is used by the password‑change endpoint that verifies the
   * current secret and, on success, updates econ_discuss_users.password_hash
   * and refreshed updated_at (both in the Actors schema). It never writes
   * plaintext to the database; only the derived hash is stored as documented
   * in the Prisma comments of econ_discuss_users.
   *
   * Ownership and lifecycle: The request is scoped to the authenticated
   * subject (econ_discuss_users.id). Optional MFA code validation aligns with
   * econ_discuss_users.mfa_enabled/mfa_secret. No system fields like id,
   * created_at, or updated_at are accepted from clients.
   */
  export type IUpdate = {
    /**
     * Current credential of the authenticated verified expert.
     *
     * This plaintext value is submitted only for verification. The backend
     * MUST hash and compare it against econ_discuss_users.password_hash
     * stored in the Actors schema (see Prisma model econ_discuss_users). No
     * plaintext is ever persisted. On success, service logic updates
     * econ_discuss_users.password_hash and touches updated_at.
     *
     * Security note: Do not log this field. Do not echo this value in
     * responses.
     */
    current_password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /**
     * New credential to be set for the account.
     *
     * On acceptance, the server replaces econ_discuss_users.password_hash
     * with a secure hash derived from this plaintext and updates
     * econ_discuss_users.updated_at (Prisma: timestamptz). Password
     * strength policies are enforced by the application; the database
     * stores only the hash, never the plaintext.
     *
     * Security note: Never return or store this plaintext value. Enforce
     * strong password rules per policy.
     */
    new_password: string & tags.MinLength<8> & tags.MaxLength<128>;

    /**
     * Optional one‑time code when multi‑factor authentication is enabled.
     *
     * If econ_discuss_users.mfa_enabled is true, the service may require a
     * TOTP or a valid recovery code (stored hashed/encrypted in
     * econ_discuss_users.mfa_recovery_codes). This field is not persisted;
     * it is used only to validate the request at runtime.
     */
    mfa_code?: string | undefined;
  };

  /**
   * Begin password reset for a verified expert by email.
   *
   * This DTO initiates an out‑of‑band reset flow using
   * econ_discuss_users.email as the lookup key in the Actors schema (Prisma
   * model econ_discuss_users). No writes to database credentials occur at
   * this stage; the server only generates and dispatches a reset token.
   *
   * Security and privacy: Do not disclose whether the email exists. Do not
   * include system‑managed fields (id, timestamps).
   */
  export type IRequest = {
    /**
     * Account email address used to locate the subject in
     * econ_discuss_users.email (unique per @@unique([email]) in the Actors
     * schema).
     *
     * The provider MUST avoid email enumeration in responses. This input is
     * used solely to initiate a time‑limited reset token delivery
     * (out‑of‑band).
     */
    email: string & tags.Format<"email">;

    /**
     * Optional BCP‑47 locale tag (e.g., "en-US") to localize the reset
     * message.
     *
     * This value is not persisted in the database tables referenced (e.g.,
     * econ_discuss_users); it only informs notification templating at send
     * time.
     */
    locale?: string | undefined;
  };
}
