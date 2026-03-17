import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformMemberSession } from "../../../../api/structures/ICommunityPlatformMemberSession";
import { IPageICommunityPlatformMemberSession } from "../../../../api/structures/IPageICommunityPlatformMemberSession";
import { MemberAuth } from "../../../../decorators/MemberAuth";
import { MemberPayload } from "../../../../decorators/payload/MemberPayload";
import { getCommunityPlatformMemberSessionsSessionId } from "../../../../providers/getCommunityPlatformMemberSessionsSessionId";
import { patchCommunityPlatformMemberSessions } from "../../../../providers/patchCommunityPlatformMemberSessions";

@Controller("/communityPlatform/member/sessions")
export class CommunityplatformMemberSessionsController {
  /**
   * Retrieve a filtered and paginated list of authenticated session records for the currently signed-in member account.
   *
   * This operation provides visibility into the member's own sign-in continuity by returning session records derived from the session model that stores each authenticated login session used for token-based authentication continuity, session history, logout processing, and revocation control. Each returned item represents a record from community_platform_member_sessions, which belongs to exactly one community_platform_members account and captures the connection context present when the session was created, including IP address, request URL context, referrer, creation time, and expiration time.
   *
   * Access to this operation is restricted to the member actor. The loaded requirements state that a signed-in session identifies the member as the same account across member-only areas of the platform and that a guest must not be treated as having a member session. For that reason, the endpoint is designed to return only the current authenticated member's own session records and must reject unauthenticated callers. It must not be used to browse other members' session histories, and it does not create, refresh, or terminate sessions by itself.
   *
   * The response is intended for account security and session awareness use cases. It helps a member review whether sessions are currently active or already expired based on the expired_at timestamp, inspect when sessions were established through created_at, and understand connection context recorded in the ip, href, and referrer columns. This aligns with the requirement that session identity remain consistent for the same member account and that member-only actions stop being allowed when the session is no longer valid.
   *
   * Because this is a list retrieval operation, clients should supply pagination, sorting, and optional filter criteria in the request body. Typical filters include active-versus-expired sessions and created-at date ranges. Related behavior such as ending the current session is handled by the dedicated logout flow, which terminates the current signed-in session and returns the user to guest access without deleting the member account or other owned resources.
   *
   * @param connection
   * @param body Session search filters and pagination options
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this operation as an authenticated member-only session history query over community_platform_member_sessions.
   *
   * Resolve the caller's member identity from the active authentication context, not from client-supplied identifiers. If no valid member session is present, reject the request as unauthorized. Do not allow the client to query sessions for another member account.
   *
   * Build a paginated query against community_platform_member_sessions filtered by community_platform_member_id equal to the authenticated member's community_platform_members.id. Support request-body-driven pagination and deterministic sorting, with a default sort of created_at descending. Support optional filters that can be satisfied by actual schema fields only, such as whether expired_at is before or after the current time, created_at range criteria, and optional exact or partial matching on ip, href, or referrer when included in the request DTO.
   *
   * Return summary records mapped from the session table only. Include fields appropriate for a session summary view, such as id, ip, href, referrer, createdAt, expiredAt, and a derived active status computed from the current time versus expired_at if the DTO supports it. Do not expose password_hash or unrelated member account internals. If the implementation joins community_platform_members, use the join only to confirm ownership or enrich minimal account context already allowed for the same authenticated user.
   *
   * The operation is read-only and must not mutate session state. It must not refresh expiry, revoke sessions, or perform logout. Those concerns belong to authentication and logout workflows. If pagination inputs are invalid, return a validation error. If filtering requests reference unsupported fields, reject them rather than ignoring them silently. Ensure stable pagination behavior even when multiple sessions share similar timestamps by using a secondary deterministic ordering such as id.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @MemberAuth()
    member: MemberPayload,
    @TypedBody()
    body: ICommunityPlatformMemberSession.IRequest,
  ): Promise<IPageICommunityPlatformMemberSession.ISummary> {
    try {
      return await patchCommunityPlatformMemberSessions({
        member,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve a single member session record by its identifier.
   *
   * This operation returns the detailed authenticated session information for one record in the member session store. It is intended for situations where the platform must inspect a specific signed-in session that represents continuity of an authenticated member account across member-only areas. In the underlying database, the session is stored in `community_platform_member_sessions`, which is described as the authenticated session record used for token-based authentication continuity, session history, logout processing, and revocation control. The returned resource is tied to exactly one parent account in `community_platform_members`, ensuring the session remains associated with the correct member identity.
   *
   * From a security and authorization perspective, this operation must only expose a session record to actors who are allowed to inspect it. In normal member-facing usage, that means the signed-in member should only be able to read sessions that belong to the same `community_platform_member_id` as the authenticated account. Guests must not access this endpoint because guest access does not establish a member session. If administrative oversight is implemented in the surrounding service policy, an administrator may also be allowed to inspect the session for operational or support purposes, but the default business expectation is ownership-based access control.
   *
   * The response is grounded in actual session fields stored by the schema: the session primary key, the owning member reference, the IP address from which the member session was established, the request URL or origin href associated with session creation, the HTTP referrer recorded when the session was created, the creation timestamp, and the expiration timestamp when the session becomes invalid unless renewed or replaced by authentication flows. These fields support the account-security requirements that the signed-in session must represent one member account at a time, keep account identity consistent during the session, and stop allowing member-only actions when the session is no longer valid.
   *
   * This endpoint is complementary to login and logout operations but does not replace them. Login establishes a member session, and logout ends the current signed-in session. This detail retrieval operation is read-only and should be used after a session already exists, for example when a member wants to review a specific active or historical session entry, or when the system needs to confirm session ownership and expiration metadata before showing account security information. If the referenced session does not exist, does not belong to the requesting member, or is otherwise not accessible under the current authorization context, the operation should fail without revealing unauthorized account information.
   *
   * @param connection
   * @param sessionId Target member session identifier
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor member
   * @x-autobe-specification Implement this operation as a single-record lookup on `community_platform_member_sessions` filtered by `id = sessionId`.
   *
   * The service must first authenticate the caller. Reject unauthenticated callers because a guest must not be treated as having a member session. For member callers, constrain the query by both `id` and `community_platform_member_id = authenticatedMember.id` so a member can only inspect their own session records. If the service supports administrative inspection, allow an admin-specific branch that can query by `id` alone or under platform policy, but keep that authorization decision outside ordinary member flow.
   *
   * Load the session row and, if needed for DTO composition, join the parent `community_platform_members` row through the declared relation on `community_platform_member_id`. Do not invent additional derived fields that are not represented in the DTO contract. Return the persisted session metadata from the schema: `id`, `community_platform_member_id`, `ip`, `href`, `referrer`, `created_at`, and `expired_at`.
   *
   * If no matching record exists after authorization scoping, return a not-found style error. If a record exists but belongs to another member and the caller is not permitted to inspect it, handle it as an authorization failure or indistinguishable not-found response according to platform security policy. The implementation should not mutate session state, refresh expiration, or perform logout side effects. This endpoint is strictly read-only.
   *
   * When mapping the response, preserve timestamp precision from the database. The implementation may additionally evaluate whether `expired_at` is in the past for downstream business logic, but such evaluation must not change stored data as part of this operation.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":sessionId")
  public async at(
    @MemberAuth()
    member: MemberPayload,
    @TypedParam("sessionId")
    sessionId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformMemberSession> {
    try {
      return await getCommunityPlatformMemberSessionsSessionId({
        member,
        sessionId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
