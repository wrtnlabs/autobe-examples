import { IConnection, HttpError } from "@nestia/fetcher";
import { PlainFetcher } from "@nestia/fetcher/lib/PlainFetcher";
import typia from "typia";
import { NestiaSimulator } from "@nestia/fetcher/lib/NestiaSimulator";

import { ICommunityBbsCommunityMember } from "../../../../structures/ICommunityBbsCommunityMember";
export * as sessions from "./sessions/index";
export * as pushTokens from "./pushTokens/index";
export * as notificationPreferences from "./notificationPreferences/index";
export * as subscriptions from "./subscriptions/index";
export * as profile from "./profile/index";

/**
 * Update a community member (community_bbs_communitymember).
 *
 * Purpose and overview:
 *
 * This operation updates an existing community member account and presentation
 * fields stored in the community_bbs_communitymember Prisma model. Typical
 * editable fields are presentation/profile values (display_name), user
 * preferences such as mfa_enabled, and other allowed account-level flags.
 * Sensitive changes (email, status, password_hash) require additional business
 * workflows: email changes MUST mark email_verified = false and trigger a
 * verification flow; status transitions to 'suspended' or 'banned' are
 * restricted to system administrators.
 *
 * Security considerations and user permissions:
 *
 * Only the authenticated account owner (the user whose username appears in the
 * path) or an authorized systemAdmin may perform this update. The
 * implementation MUST enforce ownership checks and role validation and record
 * the acting actor in community_bbs_audit_logs. If the target member is
 * soft-deleted (deleted_at IS NOT NULL), the operation MUST return 404.
 *
 * IMPORTANT: The response is a sanitized view that excludes authentication
 * secrets and internal-only fields. The following fields MUST NOT be returned:
 * password_hash, password_reset_token_hash, password_reset_expires_at.
 * Diagnostic fields such as failed_login_attempts and lockout_until are
 * considered sensitive and should only be returned to the account owner or
 * systemAdmin; document and enforce this in implementation.
 *
 * Relationship to underlying database entity:
 *
 * This operation maps to the Prisma model community_bbs_communitymember and
 * MUST only reference its fields (email, password_hash, username, display_name,
 * karma, email_verified, status, failed_login_attempts, lockout_until,
 * last_login_at, password_reset_token_hash, password_reset_expires_at,
 * mfa_enabled, created_at, updated_at, deleted_at). The request DTO for this
 * operation is ICommunityBbsCommunityMember.IUpdate and the response DTO is a
 * sanitized variant ICommunityBbsCommunityMember.ISummary (omits sensitive
 * fields). The request MUST NOT duplicate the path parameter username inside
 * the body.
 *
 * Validation rules and business logic:
 *
 * - Path parameter selection: use username (unique column) as the path identifier
 *   for better readability and to align with composite unique rules in the
 *   schema.
 * - Immutable fields: id and created_at MUST NOT be modifiable via this endpoint;
 *   attempts to change them MUST produce 400 validation errors.
 * - Email changes: when email is changed, the server MUST set email_verified =
 *   false and initiate the email verification workflow; the response SHOULD
 *   indicate that re-verification is required via a dedicated flag (e.g.,
 *   emailReverificationRequired).
 * - Password updates: password changes MUST be handled securely (only hashed
 *   password_hash stored). Prefer a dedicated password change endpoint, and if
 *   password is changed here, ensure sessions are rotated and refresh tokens
 *   revoked.
 * - Status changes: transitions to 'suspended' or 'banned' MUST be allowed only
 *   for systemAdmin actors; non-admin attempts MUST return 403.
 *
 * Related API operations:
 *
 * - GET /communityMembers/{username} — retrieve member details (use sanitized
 *   view)
 * - PATCH /communityMembers/{username}/sessions — search and manage member
 *   sessions
 * - POST /auth/logout and session revocation endpoints — used to revoke sessions
 *   when authentication fields change
 *
 * Expected behavior and error handling:
 *
 * - Success (200): returns the updated sanitized
 *   ICommunityBbsCommunityMember.ISummary representation (no authentication
 *   secrets)
 * - Validation error (400): when provided fields violate constraints or attempt
 *   to modify immutable fields
 * - Unauthorized (403): when the caller lacks permission to change restricted
 *   fields
 * - Not found (404): when the username does not exist or the account is
 *   soft-deleted
 * - Side effects: changes to authentication/identity fields MUST trigger session
 *   revocation and audit log entries
 *
 * @param props.connection
 * @param props.username Unique username of the target community member (global
 *   scope)
 * @param props.body Fields to update for the community member. Do NOT include
 *   the path parameter 'username' in the body. Use
 *   ICommunityBbsCommunityMember.IUpdate for editable fields such as
 *   display_name and mfa_enabled. Sensitive fields follow additional
 *   verification/authorization flows.
 * @path /communityBbs/communityMember/communityMembers/:username
 * @accessor api.functional.communityBbs.communityMember.communityMembers.update
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function update(
  connection: IConnection,
  props: update.Props,
): Promise<update.Response> {
  return true === connection.simulate
    ? update.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...update.METADATA,
          path: update.path(props),
          status: null,
        },
        props.body,
      );
}
export namespace update {
  export type Props = {
    /** Unique username of the target community member (global scope) */
    username: string;

    /**
     * Fields to update for the community member. Do NOT include the path
     * parameter 'username' in the body. Use
     * ICommunityBbsCommunityMember.IUpdate for editable fields such as
     * display_name and mfa_enabled. Sensitive fields follow additional
     * verification/authorization flows.
     */
    body: ICommunityBbsCommunityMember.IUpdate;
  };
  export type Body = ICommunityBbsCommunityMember.IUpdate;
  export type Response = ICommunityBbsCommunityMember.ISummary;

  export const METADATA = {
    method: "PUT",
    path: "/communityBbs/communityMember/communityMembers/:username",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Omit<Props, "body">) =>
    `/communityBbs/communityMember/communityMembers/${encodeURIComponent(props.username ?? "null")}`;
  export const random = (): ICommunityBbsCommunityMember.ISummary =>
    typia.random<ICommunityBbsCommunityMember.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: update.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: update.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("username")(() => typia.assert(props.username));
      assert.body(() => typia.assert(props.body));
    } catch (exp) {
      if (!typia.is<HttpError>(exp)) throw exp;
      return {
        success: false,
        status: exp.status,
        headers: exp.headers,
        data: exp.toJSON().message,
      } as any;
    }
    return random();
  };
}
