import { Controller } from "@nestjs/common";
import { TypedRoute, TypedParam, TypedBody } from "@nestia/core";
import typia from "typia";
import { putCommunityBbsCommunityMemberCommunityMembersUsername } from "../../../../providers/putCommunityBbsCommunityMemberCommunityMembersUsername";
import { CommunitymemberAuth } from "../../../../decorators/CommunitymemberAuth";
import { CommunitymemberPayload } from "../../../../decorators/payload/CommunitymemberPayload";

import { ICommunityBbsCommunityMember } from "../../../../api/structures/ICommunityBbsCommunityMember";

@Controller("/communityBbs/communityMember/communityMembers/:username")
export class CommunitybbsCommunitymemberCommunitymembersController {
  /**
   * Update a community member (community_bbs_communitymember).
   *
   * Purpose and overview:
   *
   * This operation updates an existing community member account and
   * presentation fields stored in the community_bbs_communitymember Prisma
   * model. Typical editable fields are presentation/profile values
   * (display_name), user preferences such as mfa_enabled, and other allowed
   * account-level flags. Sensitive changes (email, status, password_hash)
   * require additional business workflows: email changes MUST mark
   * email_verified = false and trigger a verification flow; status transitions
   * to 'suspended' or 'banned' are restricted to system administrators.
   *
   * Security considerations and user permissions:
   *
   * Only the authenticated account owner (the user whose username appears in
   * the path) or an authorized systemAdmin may perform this update. The
   * implementation MUST enforce ownership checks and role validation and record
   * the acting actor in community_bbs_audit_logs. If the target member is
   * soft-deleted (deleted_at IS NOT NULL), the operation MUST return 404.
   *
   * IMPORTANT: The response is a sanitized view that excludes authentication
   * secrets and internal-only fields. The following fields MUST NOT be
   * returned: password_hash, password_reset_token_hash,
   * password_reset_expires_at. Diagnostic fields such as failed_login_attempts
   * and lockout_until are considered sensitive and should only be returned to
   * the account owner or systemAdmin; document and enforce this in
   * implementation.
   *
   * Relationship to underlying database entity:
   *
   * This operation maps to the Prisma model community_bbs_communitymember and
   * MUST only reference its fields (email, password_hash, username,
   * display_name, karma, email_verified, status, failed_login_attempts,
   * lockout_until, last_login_at, password_reset_token_hash,
   * password_reset_expires_at, mfa_enabled, created_at, updated_at,
   * deleted_at). The request DTO for this operation is
   * ICommunityBbsCommunityMember.IUpdate and the response DTO is a sanitized
   * variant ICommunityBbsCommunityMember.ISummary (omits sensitive fields). The
   * request MUST NOT duplicate the path parameter username inside the body.
   *
   * Validation rules and business logic:
   *
   * - Path parameter selection: use username (unique column) as the path
   *   identifier for better readability and to align with composite unique
   *   rules in the schema.
   * - Immutable fields: id and created_at MUST NOT be modifiable via this
   *   endpoint; attempts to change them MUST produce 400 validation errors.
   * - Email changes: when email is changed, the server MUST set email_verified =
   *   false and initiate the email verification workflow; the response SHOULD
   *   indicate that re-verification is required via a dedicated flag (e.g.,
   *   emailReverificationRequired).
   * - Password updates: password changes MUST be handled securely (only hashed
   *   password_hash stored). Prefer a dedicated password change endpoint, and
   *   if password is changed here, ensure sessions are rotated and refresh
   *   tokens revoked.
   * - Status changes: transitions to 'suspended' or 'banned' MUST be allowed only
   *   for systemAdmin actors; non-admin attempts MUST return 403.
   *
   * Related API operations:
   *
   * - GET /communityMembers/{username} — retrieve member details (use sanitized
   *   view)
   * - PATCH /communityMembers/{username}/sessions — search and manage member
   *   sessions
   * - POST /auth/logout and session revocation endpoints — used to revoke
   *   sessions when authentication fields change
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
   * - Side effects: changes to authentication/identity fields MUST trigger
   *   session revocation and audit log entries
   *
   * @param connection
   * @param username Unique username of the target community member (global
   *   scope)
   * @param body Fields to update for the community member. Do NOT include the
   *   path parameter 'username' in the body. Use
   *   ICommunityBbsCommunityMember.IUpdate for editable fields such as
   *   display_name and mfa_enabled. Sensitive fields follow additional
   *   verification/authorization flows.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put()
  public async update(
    @CommunitymemberAuth()
    communityMember: CommunitymemberPayload,
    @TypedParam("username")
    username: string,
    @TypedBody()
    body: ICommunityBbsCommunityMember.IUpdate,
  ): Promise<ICommunityBbsCommunityMember.ISummary> {
    try {
      return await putCommunityBbsCommunityMemberCommunityMembersUsername({
        communityMember,
        username,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
