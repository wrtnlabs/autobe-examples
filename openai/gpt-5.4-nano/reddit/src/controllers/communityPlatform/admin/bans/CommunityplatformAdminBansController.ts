import { TypedBody, TypedParam, TypedRoute } from "@nestia/core";
import { Controller } from "@nestjs/common";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityBan } from "../../../../api/structures/ICommunityPlatformCommunityBan";
import { IPageICommunityPlatformCommunityBan } from "../../../../api/structures/IPageICommunityPlatformCommunityBan";
import { AdminAuth } from "../../../../decorators/AdminAuth";
import { AdminPayload } from "../../../../decorators/payload/AdminPayload";
import { deleteCommunityPlatformAdminBansBanId } from "../../../../providers/deleteCommunityPlatformAdminBansBanId";
import { getCommunityPlatformAdminBansBanId } from "../../../../providers/getCommunityPlatformAdminBansBanId";
import { patchCommunityPlatformAdminBans } from "../../../../providers/patchCommunityPlatformAdminBans";
import { postCommunityPlatformAdminBans } from "../../../../providers/postCommunityPlatformAdminBans";
import { putCommunityPlatformAdminBansBanId } from "../../../../providers/putCommunityPlatformAdminBansBanId";

@Controller("/communityPlatform/admin/bans")
export class CommunityplatformAdminBansController {
  /**
   * Apply a community ban that prevents a member from creating posts and writing comments in a specific community.
   *
   * This operation is for the moderation workflow where an authorized moderator (or the community owner, if applicable) applies a restriction that takes effect immediately for subsequent posting/commenting attempts. The restriction is scoped to the target community, and banned users can still view community content.
   *
   * The operation persists the ban in the community ban table and also records an audit/timeline snapshot in the ban snapshot table so the ban state can be rendered consistently across time.
   *
   * Authorization is required: the system must verify that the requesting actor has moderation authority for the target community according to the platform’s moderation authority limits. If the actor does not have authority to manage bans for that community, the request must be rejected.
   *
   * Validation and consistency: the system must ensure the target community and the targeted member exist, and it must handle “ban already exists” requests consistently (either return the existing ban record or reject as a conflict, per the project’s chosen behavior). When a ban is applied, the transaction must ensure the ban record and its corresponding snapshot are created together atomically.
   *
   * Related operations: ban removal/unban should be implemented as a separate action that lifts the restriction immediately; posting/comment eligibility is determined by the ban’s current state at the time the user attempts the action.
   *
   * @param connection
   * @param body Ban application request specifying the target community, the member to ban, effective timing, and the moderator-provided reason.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Service-layer algorithm for POST /bans:
   *
   * 1) Parse request body fields:
   * - communityId (maps to community_platform_communities.id)
   * - bannedUserId (maps to community_platform_members.id)
   * - appliedByModeratorId (maps to community_platform_members.id) OR infer from authenticated actor per implementation.
   * - banReason (maps to community_platform_community_bans.ban_reason)
   * - effectiveAt (maps to community_platform_community_bans.banned_at)
   * - effectiveUntil (optional; maps to community_platform_community_bans.unbanned_at)
   *
   * 2) Authorization:
   * - Verify actor has community moderation authority for the given community_id.
   * - Ensure owner is allowed and moderators are allowed within role limits.
   * - Reject if the actor cannot manage bans for this community.
   *
   * 3) Existence checks:
   * - Load community by communityId (must exist and not be deleted per query policy used by service).
   * - Load member by bannedUserId.
   *
   * 4) Ban state consistency:
   * - Query community_platform_community_bans for an active ban for the same (community_id, banned_user_id) where deleted_at is null (or consistent active filter) and unbanned_at is null (or equivalent active criterion per implementation).
   * - If already banned:
   *   - Apply consistent configured behavior: either return the existing ban record (no-op) OR reject with a conflict.
   *
   * 5) Create ban record in a transaction:
   * - Insert into community_platform_community_bans:
   *   - community_id = communityId
   *   - banned_user_id = bannedUserId
   *   - applied_by_moderator_id = appliedByModeratorId
   *   - banned_at = effectiveAt
   *   - unbanned_at = effectiveUntil (nullable)
   *   - ban_reason = banReason
   *
   * 6) Insert snapshot for audit/timeline:
   * - Insert into community_platform_community_ban_snapshots with:
   *   - community_ban_id = newly created ban id
   *   - community_id = communityId
   *   - banned_user_id = bannedUserId
   *   - applied_by_moderator_id = appliedByModeratorId
   *   - ban_status = (active for this snapshot moment)
   *   - reason = banReason
   *   - effective_from = effectiveAt
   *   - effective_until = effectiveUntil
   *
   * 7) Return response:
   * - Return a detailed representation mapped from the created community_platform_community_bans row, optionally including snapshot reference if supported by DTO.
   *
   * Edge cases:
   * - Ensure transaction boundaries cover both ban insert and snapshot insert.
   * - Ensure immediate-effect rule by using the created ban rows as the source of truth for subsequent eligibility checks.
   *
   * Error handling:
   * - Authorization failures: reject.
   * - Not found: reject.
   * - Persistence errors: rollback transaction and return server error.
   * - Repeat ban handling: follow the chosen consistent behavior for already banned requests.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Post()
  public async create(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: ICommunityPlatformCommunityBan.ICreate,
  ): Promise<ICommunityPlatformCommunityBan> {
    try {
      return await postCommunityPlatformAdminBans({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Search and browse community ban records with flexible criteria.
   *
   * This endpoint provides a filtered, paginated view of ban applications stored in `community_platform_community_bans`. It is intended for moderator/owner moderation consoles (and potentially admins) to understand who is currently banned or has been banned within a community, when the ban became effective (`banned_at`), whether/when it was lifted (`unbanned_at`), and the moderator note (`ban_reason`).
   *
   * The underlying data includes:
   * - The banned member identity (`banned_user_id`)
   * - The community where the restriction applies (`community_id`)
   * - The moderator who applied the ban (`applied_by_moderator_id`)
   * - Ban timeline fields (`banned_at`, `unbanned_at`)
   * - Moderation metadata (`ban_reason`, `created_at`, `updated_at`)
   * - A deletion marker (`deleted_at`) used to exclude removed records from active consideration.
   *
   * Banned users must still be able to view community content while they cannot create posts or write comments in that community during the ban window; those posting/comment eligibility effects are enforced by the service layer when users attempt restricted actions (see ban enforcement behavior in the requirements). This operation is read-only and only exposes the moderation history records.
   *
   * Security and authorization: only actors with moderation viewing authority should access this endpoint. In particular, the community owner and permitted moderators must be able to view ban records for communities they manage; administrators may be allowed to view more broadly. Unauthorized access must be rejected.
   *
   * Filtering rules and error handling: request fields are validated for correct identifier formats (UUID) and time ranges. If both an explicit community filter and a banned-user filter are provided, results must match both constraints. If `onlyActive` is set, records are those where the ban has effective time and is not lifted (`unbanned_at` is null) while not excluded by `deleted_at`. The endpoint never modifies any ban state.
   *
   * Related operations: this endpoint complements ban management actions (ban/unban) that update the active restriction immediately for the next attempted action. After performing a ban/unban, clients can call this search to refresh the moderation list and confirm the effective timeline.
   *
   * Expected behavior: returns a paginated list of ban summaries based on the applied filters and requested sorting.
   *
   * @param connection
   * @param body Search criteria and pagination/sorting controls for community bans.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implement a read-only filtered search over `community_platform_community_bans`.
   *
   * Algorithm:
   * 1) Authenticate request actor and enforce authorization to view ban records (community owner/moderator authority model). Reject unauthorized actors.
   * 2) Parse requestBody into an `ICommunityPlatformBan.IRequest`-like DTO (typeName referenced below). Validate UUID strings for:
   *    - communityId
   *    - bannedUserId
   *    - appliedByModeratorId
   *    Also validate optional time window inputs (start/end) for consistency (start <= end) and limit their span if the DTO specifies constraints.
   * 3) Build a query against `community_platform_community_bans`:
   *    - Exclude rows where `deleted_at` is not null (treat as removed from active consideration).
   *    - If communityId is provided: add `community_id = communityId`.
   *    - If bannedUserId is provided: add `banned_user_id = bannedUserId`.
   *    - If appliedByModeratorId is provided: add `applied_by_moderator_id = appliedByModeratorId`.
   *    - If onlyActive is true: add `(unbanned_at is null)`; additionally ensure the record has `banned_at` <= now if the DTO defines that behavior.
   *    - If onlyLifted (or onlyInactive) is provided: add `unbanned_at is not null`.
   *    - Apply optional reason keyword filter using `ban_reason` (e.g., case-insensitive contains) if the DTO provides it.
   *    - Apply optional effectiveFrom/effectiveUntil filtering using `banned_at` and/or `unbanned_at` as defined by the request DTO.
   * 4) Apply sorting and pagination:
   *    - Convert sort fields from the DTO into allowed columns (e.g., `banned_at`, `unbanned_at`, `created_at`).
   *    - Implement pagination using the shared pagination strategy used by list endpoints (cursor or offset as defined by the DTO implementation). Return pagination metadata in the response type.
   * 5) Select list-row summary fields required by `ICommunityPlatformBan.ISummary`.
   * 6) Return `IPageICommunityPlatformBan.ISummary`.
   *
   * Transactions: none (read-only).
   * Edge cases:
   * - No records matching filters: return an empty page.
   * - Conflicting filters (e.g., onlyActive with an explicit unbannedAt range that cannot match): return empty page.
   * - Large result sets: always enforce pagination limits.
   *
   * Note: This operation must not change any ban records; ban timeline effects are managed by separate ban/unban write operations.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Patch()
  public async index(
    @AdminAuth()
    admin: AdminPayload,
    @TypedBody()
    body: ICommunityPlatformCommunityBan.IRequest,
  ): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
    try {
      return await patchCommunityPlatformAdminBans({
        admin,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Retrieve the details of a single community ban by its identifier.
   *
   * This endpoint is for viewing the current state of a specific ban record stored in `community_platform_community_bans`, including the target community (`community_id`), the banned member (`banned_user_id`), the moderator who applied it (`applied_by_moderator_id`), and lifecycle timestamps (`banned_at`, `unbanned_at`). The moderation note is returned via `ban_reason` along with the ban record’s audit timestamps (`created_at`, `updated_at`).
   *
   * Bans define a restricted lifecycle for the banned user within a specific community: while `unbanned_at` is null (or otherwise indicates the ban is still active in the live record), the system must treat the user as unable to create posts or write comments in that community, while still allowing them to view community content. When an unban occurs, the ban’s restriction effect must cease, which is reflected by `unbanned_at` being set in the live ban record.
   *
   * Security and authorization: because the path only provides `banId`, the service implementation must first load the ban record to determine `community_id`. Then it must enforce that the acting actor is allowed to view moderation details for that community (for example, the community owner or an assigned moderator), matching the platform’s moderation authority model. If the actor no longer has required authority for that community at the time of the operation, the system must deny access.
   *
   * Related data: `community_platform_community_ban_snapshots` stores point-in-time audit snapshots (community_id, banned user, applied-by moderator, `ban_status`, `reason`, `effective_from`, `effective_until`, and snapshot timestamps). This operation focuses on the live ban record for `banId`; if full snapshot history is required, it should be handled by a dedicated history endpoint rather than expanding this response.
   *
   * Error handling: if `banId` does not exist (or is not accessible under authorization rules), the operation must respond with an appropriate not-found/forbidden error. If the ban record is unavailable due to retention or record lifecycle handling, treat it as not accessible to the caller.
   *
   * @param connection
   * @param banId Unique identifier of the community ban record to retrieve (UUID).
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification Implementation steps:
   * 1. Validate `banId` format (UUID expected by DTO mapping).
   * 2. Load the row from `community_platform_community_bans` by `id = banId`, selecting at least: `community_id`, `banned_user_id`, `applied_by_moderator_id`, `banned_at`, `unbanned_at`, `ban_reason`, `created_at`, `updated_at`, and `deleted_at` (if present) to determine accessibility.
   * 3. If no row exists, return not found.
   * 4. Determine the requesting actor’s permissions for the derived `community_id`:
   *    - The community owner (from `community_platform_communities.community_owner_id`) is highest authority.
   *    - An assigned moderator is authorized when `community_platform_community_moderators` contains an active assignment for that community and the actor’s member identity.
   *    - If the actor does not have authority for the community at this time, deny.
   * 5. Map the live ban record fields to the response DTO (`ICommunityPlatformCommunityBan`).
   * 6. Do not auto-embed snapshot history; snapshots are available via `community_platform_community_ban_snapshots` but should be fetched only by a separate endpoint.
   *
   * Transactionality: read-only operation; no transaction required beyond a consistent read.
   *
   * Edge cases:
   * - If the ban record has `deleted_at` set, treat it as inaccessible/not-found for list/detail visibility unless there is an explicit retention exception for moderation history (not assumed here).
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Get(":banId")
  public async at(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
  ): Promise<ICommunityPlatformCommunityBan> {
    try {
      return await getCommunityPlatformAdminBansBanId({
        admin,
        banId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Update a community ban record identified by banId.
   *
   * This endpoint is used by moderation-capable actors to change the effective state of a ban within a specific community. The system records moderation attribution and reason in the live ban record (community_platform_community_bans) and preserves point-in-time auditability through community_platform_community_ban_snapshots.
   *
   * Security and authorization are strict: when processing the ban action (ban or unban), the system must verify that the caller has moderation authority for the target community. The community owner has the highest authority, and permitted moderators can manage bans within the role limits defined by community moderation membership. If the caller lacks the required moderation authority, the request must be rejected.
   *
   * Validation and business logic are driven by the ban lifecycle: if an unban is requested for a user who is not currently banned in the community, the system must reject the request. Ban and unban actions must take effect immediately for the next attempted action in that community. If a ban is requested for a user who is already banned, the system must handle the request consistently as either a no-op or a conflict; the implementation must keep this behavior consistent for repeat requests.
   *
   * Underlying data mapping: the operation updates community_platform_community_bans fields including community_id, banned_user_id, applied_by_moderator_id, banned_at, unbanned_at, and ban_reason. For audit correctness, the system must also create a community_platform_community_ban_snapshots row capturing the effective time window and moderation metadata at the moment of the change. The snapshot's community_id, banned_user_id, applied_by_moderator_id, ban_status, reason, effective_from, and effective_until must reflect the new effective lifecycle state.
   *
   * The outcome impacts participation eligibility: while a ban is active, the banned member must be prevented from creating posts and writing comments in that community; banned members can still view community content. When unbanned, the user's ability to create posts and comments must be restored according to the member’s current subscription eligibility.
   *
   * Related operations: ban and unban actions conceptually connect to moderation viewing flows and content permission checks that consult the current ban state (community_platform_community_bans where unbanned_at is null). For viewing moderation history or current ban list, dedicated read operations should be used; this endpoint is the state-changing action.
   *
   * @param connection
   * @param banId Identifier of the community ban record to update.
   * @param body Ban update payload describing the intended lifecycle action (apply ban vs unban) and the moderator-provided reason/reason update.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1) Authorization and lookup
   * - Parse banId from path.
   * - Load community_platform_community_bans by id where deleted_at is null.
   * - Load the related community_platform_communities to identify the community_owner_id.
   * - Determine caller actor identity and role (owner vs moderator) and verify authority:
   *   - Owner: allow if caller is the community owner.
   *   - Moderator: allow if caller is assigned as moderator in community_platform_community_moderators for this community and the caller is managing a ban within their authority constraints.
   *   - Prevent invalid authority cases (e.g., moderators cannot remove/ban the owner if such a scenario would imply managing authority outside allowed limits).
   * - If not authorized, reject.
   *
   * 2) Determine target lifecycle action
   * - Use request body to identify whether the intention is to apply a ban or lift (unban) it.
   * - Load current ban state from community_platform_community_bans:
   *   - Active when unbanned_at is null.
   *   - Lifted when unbanned_at is not null.
   *
   * 3) Validate eligibility and consistency
   * - If request intends unban:
   *   - If the ban is not active (unbanned_at not null), reject (unban not banned user rejection).
   * - If request intends ban:
   *   - If the ban is already active, handle consistently as either:
   *     a) no-op (keep existing effective state), or
   *     b) conflict rejection.
   *   - The chosen behavior must remain consistent for repeat requests.
   *
   * 4) Apply update in a transaction
   * - Begin transaction.
   * - Update community_platform_community_bans:
   *   - For ban: set banned_at to now (or request-provided effective timestamp if explicitly supported by the request DTO), set unbanned_at = null, update ban_reason, and set applied_by_moderator_id to the caller member id.
   *   - For unban: set unbanned_at = now (or request-provided), and update ban_reason (if provided).
   *   - Preserve community_id and banned_user_id from existing record.
   * - Create community_platform_community_ban_snapshots capturing point-in-time moderation state:
   *   - community_ban_id = updated ban id
   *   - community_id, banned_user_id, applied_by_moderator_id copied from the resulting live state attribution
   *   - ban_status set to reflect the new state (active for ban, lifted for unban)
   *   - reason copied from ban_reason (or request reason)
   *   - effective_from = banned_at (for ban) or the existing/new effective start (for unban use the time the unban becomes effective)
   *   - effective_until = unbanned_at for ban-lifted snapshot, and null for an active ban snapshot
   * - Commit transaction.
   *
   * 5) Post-conditions
   * - Ensure the updated live ban state is immediately visible for subsequent permission checks.
   * - Return the updated ban representation DTO.
   *
   * 6) Error handling
   * - Handle not-found banId.
   * - Handle database concurrency by re-checking current unbanned_at state within the transaction before applying changes.
   * - Return validation/authorization errors with clear messages mapped by the service layer.
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Put(":banId")
  public async update(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
    @TypedBody()
    body: ICommunityPlatformCommunityBan.IUpdate,
  ): Promise<ICommunityPlatformCommunityBan> {
    try {
      return await putCommunityPlatformAdminBansBanId({
        admin,
        banId,
        body,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  /**
   * Permanently removes a community ban entry identified by banId, lifting the restriction for the banned member in the relevant community.
   *
   * This operation corresponds to the ban record stored in the community_platform_community_bans table (which includes community_id, banned_user_id, applied_by_moderator_id, banned_at, unbanned_at, and ban_reason). After this operation succeeds, the targeted ban record is no longer available for subsequent moderation checks and the user’s restriction in that community ends (so the previously banned user can participate in posting and commenting again under the community’s normal eligibility rules).
   *
   * Access control is enforced before performing the removal. The system must ensure the caller has moderation authority for the target community, and that authority limits are respected: the community owner has the highest authority; moderators can ban/unban within their permitted scope; and any moderation action attempted without the required authority must be rejected.
   *
   * Validation and behavior requirements:
   *
   * - If banId does not identify an existing ban record, the request fails.
   * - If the caller lacks required moderation authority for the ban’s community, the request is rejected and no data change is applied.
   * - When removal succeeds, subsequent viewing of community content remains allowed for the affected member (viewing is not restricted by bans), while restrictions related to creating posts and comments in that community cease immediately.
   *
   * This operation is related to other moderation endpoints (ban creation/ban viewing and community moderation views). Clients that need to display current ban status should call the corresponding ban list/view operations after erase to refresh UI state.
   *
   *
   * @param connection
   * @param banId Unique identifier of the community ban record to remove.
   * @x-autobe-authorization-type null
   * @x-autobe-authorization-actor admin
   * @x-autobe-specification 1) Authorization
   * - Load the target community_platform_community_bans row by id = banId.
   * - Determine the target community_id from the loaded ban.
   * - Enforce moderation authority for that community:
   *   - community owner can unban
   *   - moderator can unban within authority constraints
   *   - reject if caller is not authorized (do not modify any rows).
   *
   * 2) Data change
   * - Permanently remove the community_platform_community_bans record with id = banId.
   * - No request body is used.
   *
   * 3) Audit/consistency
   * - If the system requires ban history via community_platform_community_ban_snapshots, ensure snapshot/audit behavior is handled according to the existing service-layer conventions (create an appropriate snapshot record capturing the lifted state if that is how history is recorded in the current implementation).
   *
   * 4) Error handling
   * - 404/Not Found if the ban record does not exist.
   * - 403/Forbidden if authorization checks fail.
   * - Ensure the operation is executed atomically with transaction boundaries around the authorization + deletion decision.
   *
   * @nestia Generated by Nestia - https://github.com/samchon/nestia
   */
  @TypedRoute.Delete(":banId")
  public async erase(
    @AdminAuth()
    admin: AdminPayload,
    @TypedParam("banId")
    banId: string & tags.Format<"uuid">,
  ): Promise<void> {
    try {
      return await deleteCommunityPlatformAdminBansBanId({
        admin,
        banId,
      });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}
