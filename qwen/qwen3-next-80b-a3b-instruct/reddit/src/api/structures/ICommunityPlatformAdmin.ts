import { tags } from "typia";

import { IAuthorizationToken } from "./IAuthorizationToken";

export namespace ICommunityPlatformAdmin {
  /**
   * Request body for the ICommunityPlatformAdmin.IJoin type, containing
   * registration information for creating a new admin account.
   *
   * This schema defines the structure of the request body for the
   * /auth/admin/join endpoint, which allows registration of new admin
   * accounts.
   *
   * The email field represents the administrator's contact email, which must
   * be unique across the platform and follow standard email format. The
   * username field is the public-facing identifier for the admin account,
   * restricted to alphanumeric characters and underscores, with a character
   * limit between 3 and 20. The password field must meet complexity
   * requirements to ensure security: at least 8 characters with at least one
   * uppercase letter, one lowercase letter, and one digit.
   *
   * These fields directly correspond to the community_platform_member table
   * in the database schema, where email and username have unique constraints,
   * and password is stored as a bcrypt hash in the password_hash field. This
   * schema ensures data integrity and security compliance during admin
   * account registration by enforcing proper validation at the API level.
   *
   * No other fields should be included as this schema precisely matches the
   * business requirement that admin accounts are registered through the same
   * member model, with ownership transferred only by existing admin users.
   */
  export type IJoin = {
    /**
     * The email address for the new admin account. Must be unique and
     * follow standard email format.
     */
    email: string & tags.Format<"email">;

    /**
     * The display username for the admin account. Must be unique and
     * contain only alphanumeric characters and underscores.
     */
    username: string &
      tags.MinLength<3> &
      tags.MaxLength<20> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">;

    /**
     * The password for the new admin account. Must be at least 8 characters
     * with at least one uppercase letter, one lowercase letter, and one
     * digit.
     */
    password: string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$">;
  };

  /**
   * Authorization response containing JWT token and admin user
   * identification.
   *
   * This response is returned after successful authentication operations such
   * as admin login or token refresh. It provides the necessary credentials
   * for the admin user to make authenticated requests to protected
   * endpoints.
   *
   * The structure follows the standard IAuthorized pattern for authentication
   * responses, ensuring consistency across the API. The id field uniquely
   * identifies the admin user, and the token field contains the encrypted JWT
   * that authenticates subsequent requests.
   */
  export type IAuthorized = {
    /**
     * Unique identifier of the authenticated admin user.
     *
     * This field corresponds to the id field in the
     * community_platform_member table and is used to identify the admin
     * user in subsequent requests. The value is a UUID that uniquely
     * identifies the admin account in the system.
     */
    id: string & tags.Format<"uuid">;

    /** JWT token information for authentication */
    token: IAuthorizationToken;
  };

  /**
   * Request payload for admin user login containing email and password for
   * authentication.
   *
   * This object is used as the request body when an admin user attempts to
   * log into the system. It contains the credentials needed to verify the
   * user's identity against the stored account information in the database.
   *
   * The email field must contain a valid email address that matches an
   * existing admin account, and the password field must contain the correct
   * password for that account. Both fields are mandatory for successful
   * authentication.
   *
   * The system uses bcrypt hashing for password verification, with a cost
   * factor of 12. The password is never stored in plaintext in the database;
   * only the hashed version is retained in the password_hash field.
   */
  export type ILogin = {
    /**
     * The email address of the admin user for authentication.
     *
     * This field corresponds to the email field in the
     * community_platform_member table and contains the registered email
     * address of the admin user. The email must be valid and match an
     * existing account in the system for successful authentication. This
     * field is required for login operations.
     */
    email: string & tags.Format<"email">;

    /**
     * The plain text password for the admin user's account.
     *
     * This field contains the user's password as provided during the
     * authentication request. The system will hash this value and compare
     * it against the stored password_hash in the community_platform_member
     * table. The password must meet complexity requirements (minimum 8
     * characters with uppercase, lowercase, and digit) as defined in the
     * business rules.
     */
    password: string;
  };

  /**
   * Request payload for token refresh containing the refresh token (provided
   * in cookie header).
   *
   * This type represents the body of a refresh token request for admin users.
   * It is an empty object since the refresh token is provided in an
   * HTTP-only, Secure, SameSite=Strict cookie header rather than in the
   * request body. This design prevents token exposure in request bodies and
   * leverages the security features of HTTP cookies.
   *
   * The operation relies on the server to extract and validate the refresh
   * token from the cookie, comparing its hash against the stored
   * refresh_token_hash in the community_platform_user_sessions table. The
   * absence of fields in this schema adheres to the security requirement that
   * authentication tokens should not be transmitted in request bodies where
   * they could be intercepted by client-side scripts.
   *
   * This schema follows the pattern established for other refresh operations
   * where the actual token data is managed client-side via secure storage
   * (cookies) and not included in the payload.
   *
   * No additional properties are required as the authentication context is
   * completely handled through the cookie mechanism and server-side session
   * validation.
   */
  export type IRefresh = {};

  /**
   * No additional payload required - moderator assignment is determined by
   * path parameters.
   *
   * This type represents an empty request body used for operations where all
   * required parameters are provided in the URL path rather than in the
   * request body. It is used for administration endpoints like assigning or
   * revoking moderator roles where the target user and community are
   * identified through path parameters (e.g.,
   * /admin/members/{memberId}/communities/{communityId}/moderator).
   *
   * The schema is intentionally empty because the system derives all
   * necessary information from the URL path and the authenticated admin
   * session. This design pattern ensures clean, RESTful API design where
   * actions are triggered by path-based resource identification rather than
   * by data in the request body.
   *
   * This schema adheres to the principle that only data necessary to modify
   * state should be included in the request body, and in this case, no data
   * modification parameters are needed beyond the path identifiers.
   *
   * No additional properties are included since:
   *
   * 1. The operation is purely an identity-based action
   * 2. The target user and community are already specified in the path
   * 3. No extra data or configuration options are required for this
   *    administrative action
   *
   * The response body for this operation will contain confirmation of the
   * action, but the request body remains empty as defined by this schema.
   */
  export type IEmpty = {};

  /**
   * Response object indicating successful assignment of moderator privileges
   * to a member within a community.
   *
   * This DTO represents the success response from the
   * /admin/members/{memberId}/communities/{communityId}/moderator POST
   * endpoint.
   *
   * It includes the communityId, memberId, and assignedAt fields to confirm
   * the assignment and provide audit context.
   *
   * This type is used exclusively for reporting the outcome of moderator
   * assignment and does not include sensitive information or relationships to
   * other entities beyond the necessary identifiers and timestamp.
   *
   * All fields are sourced directly from the community_platform_moderator and
   * community_platform_communities tables per the Prisma schema.
   *
   * The type is designed to be minimal and focused on the assignment outcome,
   * ensuring no data leakage or unnecessary payload size.
   *
   * Example usage: { "communityId": "550e8400-e29b-41d4-a716-446655440000",
   * "memberId": "550e8400-e29b-41d4-a716-446655440001", "assignedAt":
   * "2025-01-15T10:30:00Z" }
   */
  export type IModeratorAssignment = {
    /**
     * The unique identifier of the community for which moderator privileges
     * were assigned.
     *
     * This corresponds to the community_platform_communities.id field in
     * the Prisma schema.
     *
     * The community_id is a UUID that uniquely identifies the community in
     * the database and is referenced in the community_platform_moderator
     * table as the community_id foreign key.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * The unique identifier of the member who was assigned as moderator.
     *
     * This corresponds to the community_platform_member.id field in the
     * Prisma schema.
     *
     * The member_id is a UUID that uniquely identifies the member account
     * in the database and is referenced in the community_platform_moderator
     * table as the member_id foreign key.
     */
    memberId: string & tags.Format<"uuid">;

    /**
     * The timestamp when the moderator assignment was created.
     *
     * This corresponds to the created_at field in the
     * community_platform_moderator table.
     *
     * The assignedAt timestamp represents the exact moment when this
     * moderator role was granted by an admin, recorded in UTC.
     */
    assignedAt: string & tags.Format<"date-time">;
  };

  /**
   * Response object indicating successful revocation of moderator privileges
   * from a member within a community.
   *
   * This DTO represents the success response from the
   * /admin/members/{memberId}/communities/{communityId}/moderator DELETE
   * endpoint.
   *
   * It includes the communityId, memberId, and revokedAt fields to confirm
   * the revocation and provide audit context.
   *
   * This type is used exclusively for reporting the outcome of moderator
   * revocation and does not include sensitive information or relationships to
   * other entities beyond the necessary identifiers and timestamp.
   *
   * All fields are sourced directly from the community_platform_moderator and
   * community_platform_communities tables per the Prisma schema.
   *
   * The type is designed to be minimal and focused on the revocation outcome,
   * ensuring no data leakage or unnecessary payload size.
   *
   * Example usage: { "communityId": "550e8400-e29b-41d4-a716-446655440000",
   * "memberId": "550e8400-e29b-41d4-a716-446655440001", "revokedAt":
   * "2025-01-15T10:45:00Z" }
   */
  export type IModeratorRevocation = {
    /**
     * The unique identifier of the community from which moderator
     * privileges were revoked.
     *
     * This corresponds to the community_platform_communities.id field in
     * the Prisma schema.
     *
     * The community_id is a UUID that uniquely identifies the community in
     * the database and is referenced in the community_platform_moderator
     * table as the community_id foreign key.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * The unique identifier of the member whose moderator privileges were
     * revoked.
     *
     * This corresponds to the community_platform_member.id field in the
     * Prisma schema.
     *
     * The member_id is a UUID that uniquely identifies the member account
     * in the database and is referenced in the community_platform_moderator
     * table as the member_id foreign key.
     */
    memberId: string & tags.Format<"uuid">;

    /**
     * The timestamp when the moderator privileges were revoked.
     *
     * This corresponds to the time of deletion from the
     * community_platform_moderator table.
     *
     * The revokedAt timestamp represents the exact moment when this
     * moderator role was removed by an admin, recorded in UTC.
     */
    revokedAt: string & tags.Format<"date-time">;
  };

  /**
   * Response body confirming the permanent ban of a user on the
   * communityPlatform system.
   *
   * This type is returned after successfully executing an admin ban
   * operation. It contains essential information about the banned user and
   * the ban action itself, enabling client-side feedback and audit logging.
   *
   * The description field requires multiple paragraphs:
   *
   * This response type represents the output of the admin ban operation,
   * providing a standardized format for confirming the permanent removal of a
   * user from the platform.
   *
   * It includes the userId (UUID of the banned member), the precise timestamp
   * when the ban was applied (bannedAt), and a boolean flag
   * (isPermanentlyBanned) confirming the permanence of the action.
   *
   * These fields correspond directly to the database modifications made in
   * the community_platform_member and community_platform_audit_logs tables,
   * ensuring data consistency between the API response and persistent
   * storage.
   *
   * The type is designed to be minimal yet complete, providing sufficient
   * context for client UI updates (e.g., showing banner messages) and backend
   * auditing without exposing sensitive internal details such as moderator
   * identities or additional metadata.
   */
  export type IUserBanStatus = {
    /**
     * The unique identifier (UUID) of the user who was banned.
     *
     * This field identifies the specific member account that has been
     * permanently banned from the platform.
     *
     * The description field requires multiple paragraphs:
     *
     * This property represents the user's unique identifier in the
     * community_platform_member table, which is the primary key for the
     * user record. When a user is banned, this ID is used to locate and
     * update their record in the database by setting the deleted_at
     * timestamp.
     *
     * This field is returned in the response to confirm which user account
     * was affected by the ban operation. It must be a valid UUID conforming
     * to RFC 4122, ensuring uniqueness and compatibility with the system's
     * database schema.
     *
     * The field is not editable by users and can only be retrieved through
     * administrative actions, ensuring proper audit trails and preventing
     * manipulation of ban records.
     */
    userId: string & tags.Format<"uuid">;

    /**
     * The timestamp when the user account was permanently banned.
     *
     * This field records the exact moment the admin's ban action was
     * successfully executed in the system.
     *
     * The description field requires multiple paragraphs:
     *
     * This property contains the DateTime value indicating when the ban
     * operation completed successfully, set according to the system's
     * server time in Asia/Seoul timezone (UTC+9).
     *
     * It corresponds to the deleted_at field in the
     * community_platform_member table, which is updated to this timestamp
     * during the ban process. This field is used for auditing, reporting
     * compliance, and determining account state change timelines.
     *
     * The value is automatically generated by the server and cannot be
     * manipulated by clients or administrators. The timestamp format
     * adheres to ISO 8601 with timezone information (e.g.,
     * "2025-07-20T12:34:56.789Z") to ensure standardized representation
     * across systems.
     */
    bannedAt: string & tags.Format<"date-time">;

    /**
     * A flag indicating whether the user has been permanently banned from
     * the system.
     *
     * This field always returns true as this endpoint only responds to
     * successful ban operations.
     *
     * The description field requires multiple paragraphs:
     *
     * This property indicates the permanence of the ban action, confirming
     * that the user's account has been permanently deactivated with no
     * possibility of recovery through self-service means.
     *
     * Since this is a response type for the ban endpoint, the value is
     * always true — its purpose is to explicitly confirm the nature of the
     * operation's outcome rather than to represent variable state.
     *
     * This boolean ensures clients can robustly interpret the server's
     * response state, differentiating between temporary suspensions
     * (handled elsewhere) and permanent user removals.
     */
    isPermanentlyBanned: boolean;
  };

  /**
   * Request body containing an optional reason for the ban, which will be
   * included in the audit log and notification.
   *
   * This object defines the structure of the ban reason payload for admin ban
   * operations. The reason is optional but if provided, it must be a string
   * with sufficient context to document the administrative action for audit
   * and compliance purposes.
   *
   * The reason should clearly describe why the ban was enacted, such as
   * 'Violation of Community Guidelines: Harassment'. This context assists
   * moderators and legal teams in understanding the basis for the action,
   * especially in cases of user appeals or regulatory inquiries.
   *
   * According to the Prisma schema, this information logs in the
   * community_platform_audit_logs table with action_description field,
   * providing an audit trail for the system's administrative actions.
   */
  export type IBanReason = {
    /**
     * An optional reason for the ban, which will be included in the audit
     * log and notification.
     */
    reason: string;
  };

  /**
   * Request payload for unban operation containing an optional reason for the
   * action.
   *
   * This object represents the data structure used when an admin initiates a
   * user unban operation. The reason field is optional and provides context
   * for why the unban action was taken, which is then included in the system
   * audit log and potentially in notifications to the affected user.
   *
   * The structure is intentionally minimal, following the pattern defined for
   * similar admin operations. Only a single string field is provided to
   * capture the administrative rationale without introducing complexity.
   *
   * In compliance with the business requirements and schema design
   * principles, this payload does not include timestamps, user identifiers or
   * other metadata - this information is derived from the authentication
   * context and request metadata by the system.
   */
  export type IUnbanReason = {
    /**
     * An optional reason for the unban, which will be included in the audit
     * log and notification.
     */
    reason?: string | undefined;
  };

  /**
   * Response payload confirming successful user unban operation.
   *
   * This object represents the standardized response structure returned after
   * a system administrator successfully unbans a previously banned user from
   * the entire communityPlatform system.
   *
   * The response contains three mandatory fields:
   *
   * - UserId: The unique identifier of the user whose account has been restored
   * - UnbannedAt: The exact timestamp (in ISO 8601 format) when the unban
   *   operation was completed
   * - Status: A constant string "unbanned" that provides unambiguous
   *   confirmation of operation success
   *
   * This response structure follows the consistent pattern established across
   * similar admin operations, providing clear, machine-readable confirmation
   * while excluding sensitive information or operational details that are
   * unnecessary for client usage.
   *
   * The returned data enables the client application to update the UI state
   * appropriately after the unban operation. The system maintains detailed
   * audit logs of this operation in the community_platform_audit_logs table,
   * preserving the admin's identity and any provided reason for the action,
   * but these audit details are not exposed in this API response for security
   * and privacy reasons.
   */
  export type IUserUnbanStatus = {
    /** The UUID of the user who was successfully unbanned from the system. */
    userId: string & tags.Format<"uuid">;

    /**
     * The timestamp when the user's account was successfully unbanned and
     * restored.
     */
    unbannedAt: string & tags.Format<"date-time">;

    /**
     * The fixed status indicator confirming the unban operation was
     * successful.
     *
     * This constant field serves as a clear machine-readable indicator that
     * the user unban operation completed successfully. The value is always
     * "unbanned" when returned by this API endpoint, providing
     * deterministic confirmation of the outcome without requiring
     * interpretation of other fields.
     */
    status: "unbanned";
  };

  /**
   * Request payload for an admin-initiated password reset, containing an
   * optional reason.
   *
   * This schema defines the structure of the body sent when an administrator
   * triggers a password reset for another user.
   *
   * There is no requirement for the reason to be provided, as this is an
   * administrative override action that may be performed under urgent
   * conditions where documentation is not immediately available. However, in
   * compliance with security best practices and audit requirements, providing
   * a reason is strongly recommended.
   *
   * The reason field helps future auditors and system administrators
   * understand the context when reviewing password reset history. It should
   * not contain sensitive information like the user's original password,
   * personal details beyond what is necessary, or speculative information
   * about the user's behavior.
   */
  export type IResetPasswordNote = {
    /**
     * An optional reason for the password reset, which will be included in
     * the audit log and notification.
     *
     * This field provides context for why the admin initiated the password
     * reset. It helps with auditing and communication with the affected
     * user. The reason should be concise and descriptive, explaining the
     * operational necessity or policy compliance reason behind the action.
     * Examples include "User reported security incident", "Password expired
     * per policy", or "Suspected account compromise".
     *
     * This field is optional to maintain flexibility in administrative
     * workflows, but it is highly recommended for compliance and account
     * recovery transparency. The description length is constrained to 1000
     * characters to ensure efficient storage and display in audit logs and
     * notifications.
     */
    reason?: (string & tags.MinLength<0> & tags.MaxLength<1000>) | undefined;
  };

  /**
   * Response payload confirming successful initiation of an admin-initiated
   * password reset.
   *
   * This schema defines the structure of the response sent after an
   * administrator successfully triggers a password reset for another user.
   *
   * The response confirms that the system has performed all necessary
   * actions: generating a secure reset token, storing it securely in the
   * database, and queuing a notification email to be delivered to the
   * affected user.
   *
   * This confirmation message is intentionally simple and non-technical to
   * display clearly on administrative interfaces. It avoids exposing internal
   * system details like token IDs, expiration times, or email delivery
   * statuses, which are stored in audit logs but not disclosed to users for
   * security reasons.
   *
   * The message field may be localized or formatted differently based on the
   * admin's language preference, but the content structure remains the same
   * across all locales.
   *
   * No additional metadata is returned because this operation is idempotent
   * and does not return new state beyond confirmation.
   */
  export type IPasswordResetInitiated = {
    /**
     * Confirmation that the password reset request has been initiated and
     * notification has been sent.
     *
     * This is a human-readable success message indicating that the system
     * has processed the admin's request to reset the user's password. The
     * message confirms two key outcomes:
     *
     * 1. The password reset token has been successfully generated and stored
     *    in the database
     * 2. The email notification containing the reset link has been queued for
     *    delivery
     *
     * The message is intended for display to the admin user on the
     * interface to confirm successful operation.
     *
     * This response does not contain any sensitive information or tokens.
     * It is purely informational and ensures administrative transparency.
     */
    message: string;
  };

  /**
   * Request payload for an admin to force email verification for a user with
   * an optional reason note.
   *
   * This schema defines the structure for an admin-initiated email
   * verification force operation, allowing optional context about why the
   * verification override is necessary. The reason field is intended for
   * audit trail purposes and should contain administrative notes that explain
   * the business justification for bypassing standard verification
   * procedures.
   *
   * The reason must be a string with a maximum length of 500 characters to
   * ensure it remains concise while allowing sufficient detail for compliance
   * and audit review. The field is optional because not all force
   * verification operations will require additional explanation, but when
   * provided, it must comply with platform audit logging standards.
   *
   * This object is referenced in the admin force verification API operation
   * and enables traceability of administrative decisions that override
   * standard user authentication flows.
   */
  export type IForceVerifyNote = {
    /**
     * An optional note explaining the reason for forcing verification,
     * included in the audit log.
     */
    reason?: (string & tags.MaxLength<500>) | undefined;
  };

  /**
   * Response model for confirming successful forced email verification by an
   * administrator.
   *
   * This schema defines the structure of the success response when an admin
   * forcibly verifies a user's email address, bypassing the standard email
   * verification workflow.
   *
   * The only property in this object is a constant message that provides
   * clear, standardized feedback to the user interface after the operation
   * completes successfully. Having a constant string ensures consistency
   * across the platform and prevents localization issues or inconsistent
   * messaging.
   *
   * This schema is designed to be minimal while still providing meaningful
   * user feedback. It doesn't include status flags or other metadata because
   * the HTTP response code (typically 200 OK) conveys success and the
   * administrator's action is already implied by the context of the
   * operation.
   *
   * By using a constant string value, this response is deterministic and
   * easily testable, ensuring the user-facing experience remains predictable
   * after admin interventions.
   */
  export type IEmailVerified = {
    /**
     * Confirmation message indicating the successful email verification.
     *
     * This response property provides a standardized confirmation message
     * to users after their email verification has been successfully forced
     * by an administrator.
     *
     * The message is specifically formatted to be user-friendly and
     * unambiguous, clearly communicating that the email verification has
     * been completed by an administrator and the account is now fully
     * active with posting privileges enabled. This feedback is necessary
     * because users may not expect their verification state to be changed
     * without their action, so a clear, simple confirmation helps prevent
     * confusion.
     *
     * The text follows platform messaging conventions and should not be
     * translated or modified, as it is part of the standardized user
     * experience.
     *
     * Unlike system logs or audit trail data, this message is designed for
     * direct end-user consumption during the client-side experience after
     * the admin operation completes.
     */
    message: "The user's email has been successfully verified.";
  };
}
