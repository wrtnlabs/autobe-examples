import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformCommunityModerator } from "../../../../../../structures/ICommunityPlatformCommunityModerator";
import { ICommunityPlatformCommunityModeratorOwner } from "../../../../../../structures/ICommunityPlatformCommunityModeratorOwner";

/**
 * Retrieve the owner-role subtype record for a specific moderator assignment within a specific community.
 *
 * This operation exposes the normalized ownership classification that extends a community moderator assignment. In the underlying schema, `community_platform_community_moderator_owners` is not an independent governance object but a strict one-to-one subtype of `community_platform_community_moderators`, used to mark a moderator assignment as the owner role for its community. The request therefore navigates through the community context and the moderator assignment context before resolving the owner subtype record itself. This design reflects the business rule that community governance is local to a single discussion space and that the owner is the highest authority in that community.
 *
 * Authorization for this operation should be treated within community-scoped governance boundaries. The loaded requirements state that owner and moderator powers apply only within the relevant community, and actions or access outside that community must be rejected. The current specification does not grant implied platform-wide admin authority, so no special administrator bypass should be assumed. Implementations should therefore validate that the caller is an authenticated member permitted to inspect moderation governance for the target community according to product policy, and should reject access when community scope does not match the caller's authority.
 *
 * The returned resource should document the exact owner subtype record stored in `community_platform_community_moderator_owners`, together with its linkage to the parent moderator assignment held in `community_platform_community_moderators`. That parent assignment contains the governed community reference, the assigned member, the granting member, role classification, lifecycle status, grant timestamp, and optional revocation metadata. Because the owner record exists only as an extension of the moderator assignment, the implementation must confirm that the requested `ownerId` belongs to the requested `moderatorId`, and that the requested `moderatorId` belongs to the requested `communityId`.
 *
 * This operation is typically used together with community moderation management endpoints that list moderator assignments or add moderators. A caller will commonly obtain the community identifier from community browsing or community detail operations first, then resolve moderator assignments in that community, and finally request this endpoint to inspect whether a given assignment is the owner-linked record. If any part of the nested relationship is missing or mismatched, the operation should fail rather than returning cross-community or unrelated governance data.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.moderatorId Target moderator assignment's ID within the community
 * @param props.ownerId Target owner-role subtype record's ID for the moderator assignment
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement a read-only service that loads a single record from `community_platform_community_moderator_owners` by `id = ownerId` and joins its parent `community_platform_community_moderators` record by `community_platform_community_moderator_id = moderatorId`. Also verify that the joined moderator assignment belongs to `community_platform_communities.id = communityId` through `community_platform_community_id`.
 *
 * Before returning data, validate the nested ownership chain in this order: confirm the community exists; confirm the moderator assignment exists and belongs to that community; confirm the owner subtype record exists and references that moderator assignment. Reject the request when any identifier does not resolve or when the identifiers refer to records from different communities or assignments.
 *
 * Apply authorization using community-scoped governance rules. Do not infer any platform-wide admin override. The implementation should require an authenticated member context and verify that the caller is allowed to inspect moderation governance for the target community according to service policy. If the caller lacks authority in that community, reject the request.
 *
 * When loading the moderator assignment, take into account lifecycle fields such as `status`, `revoked_at`, and `deleted_at`. If the service policy disallows returning revoked or deleted governance records, reject them consistently. If historical inspection is allowed, return the record together with its current status as represented in the DTO. Do not fabricate fields that are not present in the schema.
 *
 * Return a single `ICommunityPlatformCommunityModeratorOwner` object. The DTO generation should preserve the owner subtype identity and include the parent moderator relationship as defined by the schema model. Error cases should include not found for missing community, moderator, or owner records, and forbidden for callers outside the allowed community governance scope.
 * @path /communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners/:ownerId
 * @accessor api.functional.communityPlatform.member.communities.moderators.owners.at
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function at(
  connection: IConnection,
  props: at.Props,
): Promise<at.Response> {
  return true === connection.simulate
    ? at.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...at.METADATA,
          path: at.path(props),
          status: null,
        },
      );
}
export namespace at {
  export type Props = {
    /**
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderator assignment's ID within the community
     */
    moderatorId: string & tags.Format<"uuid">;

    /**
     * Target owner-role subtype record's ID for the moderator assignment
     */
    ownerId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommunityModeratorOwner;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners/:ownerId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/moderators/${encodeURIComponent(props.moderatorId ?? "null")}/owners/${encodeURIComponent(props.ownerId ?? "null")}`;
  export const random = (): ICommunityPlatformCommunityModeratorOwner =>
    typia.random<ICommunityPlatformCommunityModeratorOwner>();
  export const simulate = (
    connection: IConnection,
    props: at.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: at.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("moderatorId")(() => typia.assert(props.moderatorId));
      assert.param("ownerId")(() => typia.assert(props.ownerId));
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

/**
 * Update a specific owner-role classification record for a moderator assignment within a community governance structure.
 *
 * This operation manages the owner subtype record that specializes a general community moderation assignment in the platform's governance model. The underlying owner table is a strict one-to-one extension of the community moderator assignment table, and the moderator assignment itself belongs to a specific community and member. The community record supplies the parent governance context, including the canonical owner membership reference and lifecycle state used for participation and discovery decisions. By addressing the owner subtype beneath a specific moderator assignment and community, this endpoint documents an explicit maintenance action on the highest-authority role representation inside a single community.
 *
 * Authorization for this operation is intentionally narrow. The requirements state that the community owner is the highest authority within community moderation, that owner and moderator roles apply only within the specific community where they were granted, and that moderator management actions must respect the owner-over-moderator hierarchy. For that reason, this operation should only be available when the acting authenticated member is confirmed to hold the effective owner authority for the referenced community. A moderator for the same community must not be allowed to use this endpoint to elevate, rewrite, or otherwise alter owner-role classification data, and users from other communities must be rejected because moderation authority never crosses community boundaries.
 *
 * The data relationship behind this endpoint spans three linked records. The parent community record stores the community identity and owner membership reference. The community moderator assignment record stores the community, assigned member, granting member, role classification, lifecycle status, grant timing, and optional revocation metadata. The owner subtype record then marks that moderator assignment as the owner role through a one-to-one specialization. Implementations must therefore validate that the provided communityId, moderatorId, and ownerId all refer to records that belong to the same governance chain, and that the referenced moderator assignment has not been mismatched to another community or another owner subtype record.
 *
 * This endpoint should be used only in governance maintenance workflows where an existing owner subtype record must be updated consistently with the moderator assignment and community hierarchy. It should not be used as a shortcut for adding a new moderator to a community; adding moderators belongs to the moderator assignment workflow itself. It should also not be used to bypass the rule that only the owner can remove moderators. Clients that need to inspect the surrounding governance context would typically retrieve the relevant community and moderator assignment information first, then call this endpoint with the exact identifiers for the targeted nested owner resource.
 *
 * If any identifier is invalid, if the moderator assignment does not belong to the specified community, if the owner subtype record does not belong to the specified moderator assignment, or if the acting member lacks owner authority in that community, the operation must fail without mutating any records. The implementation must also reject attempts to use this endpoint against deleted, revoked, or cross-community governance records when those states would make the update inconsistent with the community-scoped moderation model.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.moderatorId Target moderator assignment's ID
 * @param props.ownerId Target owner subtype record's ID
 * @param props.body Owner role update data
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Load the community_platform_communities record by communityId, the community_platform_community_moderators record by moderatorId, and the community_platform_community_moderator_owners record by ownerId within a single transaction or equivalent consistent read boundary.
 *
 * Validate referential chain integrity before any update is applied. Confirm that the moderator assignment's community_platform_community_id equals the requested communityId. Confirm that the owner subtype's community_platform_community_moderator_id equals the requested moderatorId. Reject the request if any record is missing, if any record is marked deleted through deleted_at where applicable, or if the moderator assignment has a lifecycle status that makes owner-role maintenance invalid, such as a revoked assignment.
 *
 * Authorize the acting user as an authenticated member only after resolving the member identity. Determine whether that member is the effective owner for the same community by checking the community's community_platform_member_id and, if the service relies on subtype-based governance resolution, the linked active moderator assignment plus owner subtype chain. Reject when the actor is merely a moderator, an unrelated member, a guest, or an admin without separately specified powers.
 *
 * Apply update logic only to fields defined in the ICommunityPlatformCommunityModeratorOwner.IUpdate schema. Do not assume fields beyond the loaded schema. If the request attempts to alter immutable linkage such as rebinding the owner subtype to a different moderator assignment, reject unless the DTO explicitly allows such reassignment and the service has business approval for it. Preserve created_at and immutable identifiers. Always refresh updated_at on the owner subtype record when a mutation succeeds.
 *
 * If the requested change affects the effective governance interpretation of the moderator assignment, validate consistency with community_platform_community_moderators.role and status so the assignment continues to represent an owner-classified, active governance record. Do not allow this endpoint to silently create missing moderator assignments or to transfer ownership across communities. Return the updated owner subtype resource after persistence.
 *
 * Error handling must distinguish not-found resources, authorization failure, and integrity mismatch between communityId, moderatorId, and ownerId. No partial mutation is allowed. If downstream audit logging exists, record the acting member, target community, target moderator assignment, and target owner subtype update event after the transaction commits.
 * @path /communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners/:ownerId
 * @accessor api.functional.communityPlatform.member.communities.moderators.owners.update
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
    /**
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderator assignment's ID
     */
    moderatorId: string & tags.Format<"uuid">;

    /**
     * Target owner subtype record's ID
     */
    ownerId: string & tags.Format<"uuid">;

    /**
     * Owner role update data
     */
    body: ICommunityPlatformCommunityModeratorOwner.IUpdate;
  };
  export type Body = ICommunityPlatformCommunityModeratorOwner.IUpdate;
  export type Response = ICommunityPlatformCommunityModeratorOwner;

  export const METADATA = {
    method: "PUT",
    path: "/communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners/:ownerId",
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
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/moderators/${encodeURIComponent(props.moderatorId ?? "null")}/owners/${encodeURIComponent(props.ownerId ?? "null")}`;
  export const random = (): ICommunityPlatformCommunityModeratorOwner =>
    typia.random<ICommunityPlatformCommunityModeratorOwner>();
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
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("moderatorId")(() => typia.assert(props.moderatorId));
      assert.param("ownerId")(() => typia.assert(props.ownerId));
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

/**
 * Permanently remove the owner-role subtype record for a moderator assignment within a community.
 *
 * This operation is part of community governance management for the community platform. It targets the owner-classification subtype stored in `community_platform_community_moderator_owners`, which extends the canonical moderator assignment record in `community_platform_community_moderators`. The route requires the caller to specify the parent community, the moderator assignment, and the owner subtype record so the service can verify that all three resources belong to the same governance chain before deleting the targeted owner-role record.
 *
 * Access to this operation is highly restricted. The requirements state that the community owner is the highest authority within community moderation, that only the owner may remove moderators from a community, and that moderators must not be allowed to remove the owner or remove other moderators. As a result, the service must allow this endpoint only when the authenticated member is the effective owner of the referenced community. Guests, ordinary members, moderators without owner standing, and users from other communities must be rejected.
 *
 * The underlying data model separates the owner-role classification from the general moderator assignment record. The `community_platform_community_moderator_owners` table is a strict one-to-one subtype that marks a specific `community_platform_community_moderators` row as the community owner. The moderator assignment itself stores the community reference, assigned member reference, granting and revocation metadata, role classification, lifecycle status, and temporal audit fields. This operation therefore must validate both nested ownership and community scope before removal so that a caller cannot delete an owner-role record through mismatched path identifiers.
 *
 * This endpoint is intended for governance workflows where community leadership changes must be enforced according to the owner-over-moderator hierarchy. If the targeted owner-role record does not exist, if the moderator assignment does not belong to the specified community, or if the caller is not authorized as the current owner of that same community, the request must be rejected. After completion, any further moderation privileges derived exclusively from the removed owner-role classification must no longer be treated as valid by downstream moderation logic.
 *
 * @param props.connection
 * @param props.communityId Target community's unique identifier.
 * @param props.moderatorId Target moderator assignment's unique identifier within the specified community.
 * @param props.ownerId Target owner-role subtype record's unique identifier for the specified moderator assignment.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as a transactional nested-resource deletion focused on community governance integrity.
 *
 * 1. Authenticate the caller as a member identity. Reject unauthenticated requests.
 * 2. Load the target community from `community_platform_communities` by `communityId` and reject if it does not exist.
 * 3. Load the target moderator assignment from `community_platform_community_moderators` by `moderatorId` and verify its `community_platform_community_id` equals `communityId`. Reject on mismatch or absence.
 * 4. Load the target owner subtype row from `community_platform_community_moderator_owners` by `ownerId` and verify its `community_platform_community_moderator_id` equals `moderatorId`. Reject on mismatch or absence.
 * 5. Determine whether the authenticated member is the effective owner of the same community. This should be validated by finding an active moderator assignment for the caller in the same community and confirming that assignment is linked to an owner subtype record. If the caller is not the current owner of the referenced community, reject the request.
 * 6. Enforce hierarchy rules from the requirements: only the owner may remove moderator role assignments; moderators cannot remove the owner or another moderator; cross-community governance actions are forbidden.
 * 7. Delete the `community_platform_community_moderator_owners` row identified by `ownerId` inside the transaction. If the service architecture requires additional governance updates after removing owner standing, apply them in the same transaction only when they are explicitly supported by the domain model. Do not invent or mutate unspecified fields.
 * 8. Return success with no response body.
 *
 * Validation and error handling:
 * - Reject when `communityId`, `moderatorId`, and `ownerId` do not describe a single consistent resource chain.
 * - Reject when the target records are missing.
 * - Reject when the actor lacks owner authority in the referenced community.
 * - Reject when the action attempts to operate across community boundaries.
 * - Ensure the delete is idempotency-safe from an HTTP semantics perspective by treating already-missing target resources as not found rather than as success if the record cannot be located at validation time.
 *
 * Implementation notes:
 * - Use row-level transactional consistency to prevent deleting an owner subtype while concurrent governance changes are occurring.
 * - Use only actual schema fields: `community_platform_community_id` on the moderator assignment and `community_platform_community_moderator_id` on the owner subtype are the key linkage fields for nested verification.
 * - Preserve auditability through existing database history mechanisms outside this endpoint if such mechanisms are implemented elsewhere; this operation itself only removes the targeted subtype record.
 * @path /communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners/:ownerId
 * @accessor api.functional.communityPlatform.member.communities.moderators.owners.erase
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function erase(
  connection: IConnection,
  props: erase.Props,
): Promise<void> {
  return true === connection.simulate
    ? erase.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...erase.METADATA,
          path: erase.path(props),
          status: null,
        },
      );
}
export namespace erase {
  export type Props = {
    /**
     * Target community's unique identifier.
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderator assignment's unique identifier within the specified community.
     */
    moderatorId: string & tags.Format<"uuid">;

    /**
     * Target owner-role subtype record's unique identifier for the specified moderator assignment.
     */
    ownerId: string & tags.Format<"uuid">;
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners/:ownerId",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/moderators/${encodeURIComponent(props.moderatorId ?? "null")}/owners/${encodeURIComponent(props.ownerId ?? "null")}`;
  export const random = (): void => typia.random<void>();
  export const simulate = (
    connection: IConnection,
    props: erase.Props,
  ): void => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: erase.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("moderatorId")(() => typia.assert(props.moderatorId));
      assert.param("ownerId")(() => typia.assert(props.ownerId));
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

/**
 * Create an owner-role classification for an existing community moderator assignment within a specific community.
 *
 * This operation is used in community governance workflows to mark an existing `community_platform_community_moderators` record as the owner role by creating its one-to-one subtype record in `community_platform_community_moderator_owners`. The underlying moderator assignment remains the canonical governance record for community-scoped authority, storing the moderated community reference, the assigned member, the granting member, the role classification, the lifecycle status, and revocation metadata. The owner subtype exists as a strict normalized extension that identifies that moderator assignment as the community owner, preserving the business rule that the community owner is the highest authority within that community.
 *
 * Access to this operation is restricted to authenticated member actors who already have valid governance authority in the target community. The loaded requirements explicitly state that owner and moderator authority apply only within the specific community where those roles were granted, and that attempts to perform moderator actions outside that community must be rejected. The current specification does not permit inferred platform-wide admin authority, so this operation must not be opened to admin based on assumption alone. Guest actors are not eligible because assigning moderation leadership is not part of public browsing behavior.
 *
 * The operation depends on the relationship between `community_platform_communities`, `community_platform_community_moderators`, `community_platform_community_moderator_owners`, and `community_platform_members`. The `community_platform_communities` table stores the community's canonical identity and owner member reference, while `community_platform_community_moderators` records which member has been granted moderation standing in that community and by whom. Creating the owner subtype is valid only when the target moderator assignment exists, belongs to the same community identified in the path, and is in a usable state for governance. Because `community_platform_community_moderator_owners` has a unique constraint on `community_platform_community_moderator_id`, the same moderator assignment cannot be classified as owner more than once.
 *
 * Clients typically use this endpoint as part of a community leadership management flow after first locating the target moderation assignment through community moderation listing or detail retrieval operations. Once this endpoint succeeds, subsequent governance-sensitive reads should reflect that the targeted assignment now carries owner semantics, and any downstream authorization logic should continue to honor the rule that the owner outranks moderators in the same community. If the community does not exist, the moderator assignment does not exist, the assignment belongs to another community, the caller lacks authority in the target community, or an owner subtype already exists for the assignment, the request must be rejected with an appropriate error.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.moderatorId Target community moderator assignment's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as a transactional owner-subtype creation on top of an existing community moderator assignment.
 *
 * 1. Authenticate the caller as a member. Do not infer admin privileges. Load the caller's member identity and verify the caller has governance authority in the target community according to community-scoped moderator rules. At minimum, confirm the caller is either the community owner or an active moderator of the community identified by `communityId`.
 *
 * 2. Load the target community from `community_platform_communities` by `id = communityId` and ensure it is a valid manageable community record. If not found, return a not-found error.
 *
 * 3. Load the target moderator assignment from `community_platform_community_moderators` by `id = moderatorId`. Verify that `community_platform_community_id` exactly matches `communityId`. Reject the request if the assignment belongs to another community. Also verify the assignment is active and not revoked or deleted, using `status`, `revoked_at`, and `deleted_at` consistently with service rules.
 *
 * 4. Check whether an owner subtype already exists in `community_platform_community_moderator_owners` for `community_platform_community_moderator_id = moderatorId`. Because the subtype table is one-to-one with a uniqueness constraint, reject duplicate creation attempts with a conflict error.
 *
 * 5. Create a new `community_platform_community_moderator_owners` row with a new UUID primary key, `community_platform_community_moderator_id = moderatorId`, and current timestamps for `created_at` and `updated_at`.
 *
 * 6. If the service layer uses the `role` field on `community_platform_community_moderators` to reflect current classification, update the target moderator assignment within the same transaction so its role is aligned with owner-linked standing. Do not modify unrelated grant or revocation fields.
 *
 * 7. Return the resulting moderator assignment as the response payload, loading any owner-linked representation needed by `ICommunityPlatformCommunityModerator`. The response should represent the moderator assignment in its post-creation governance state.
 *
 * Validation and error handling:
 * - Reject when the caller is neither owner nor moderator in the target community.
 * - Reject when `communityId` does not identify an existing community.
 * - Reject when `moderatorId` does not identify an existing moderator assignment.
 * - Reject when the moderator assignment is outside the specified community.
 * - Reject when the target assignment is revoked, deleted, or otherwise unavailable for governance updates.
 * - Reject when an owner subtype already exists for the assignment.
 * - Use a transaction to prevent race conditions between duplicate owner-subtype creation attempts.
 * @path /communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners
 * @accessor api.functional.communityPlatform.member.communities.moderators.owners.create
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function create(
  connection: IConnection,
  props: create.Props,
): Promise<create.Response> {
  return true === connection.simulate
    ? create.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...create.METADATA,
          path: create.path(props),
          status: null,
        },
      );
}
export namespace create {
  export type Props = {
    /**
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target community moderator assignment's ID
     */
    moderatorId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommunityModerator;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/moderators/${encodeURIComponent(props.moderatorId ?? "null")}/owners`;
  export const random = (): ICommunityPlatformCommunityModerator =>
    typia.random<ICommunityPlatformCommunityModerator>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("moderatorId")(() => typia.assert(props.moderatorId));
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

/**
 * Promote a community moderator assignment to the owner role for the specified community.
 *
 * This operation applies a community-governance change within the canonical community record stored in `community_platform_communities` and the community-scoped moderator assignment stored in `community_platform_community_moderators`. The target community is the independently managed discussion space whose identity, owner membership reference, descriptive presentation fields, and lifecycle state determine participation and governance context. The target moderator assignment is the canonical governance record that identifies which member has moderation standing in that community, who granted it, what role classification it currently carries, and whether the assignment remains active or has been revoked. Creating the nested owner resource causes the specified moderator assignment to become the owner-linked assignment represented by `community_platform_community_moderator_owners`, which is the strict one-to-one subtype used to classify a moderator assignment as the owner role for its community.
 *
 * Access to this operation must be limited to an authenticated member who already holds owner authority in the same community. The business rules state that the community owner is the highest authority in that community's moderator structure and that owner and moderator authority apply only within the specific community where the role was granted. Because current requirements do not recognize any implied platform-wide administrative override, this operation must not grant access to guests or infer access for admin. The request must be rejected when the acting member is not the current owner of the specified community, when the target moderator assignment belongs to a different community, or when the assignment is not eligible for owner classification.
 *
 * This endpoint depends on an existing moderator assignment. In normal workflow, the client would first create or identify a moderator through the community moderator management APIs, then invoke this endpoint to elevate that assignment into owner standing. The target moderator assignment should be active, not revoked, and still associated with the same `community_platform_community_id` referenced by the path. The implementation should also consider the underlying community lifecycle state from `community_platform_communities.status`, because governance actions on unavailable or removed communities may need to be rejected according to service-level policy.
 *
 * The response returns the owner subtype resource created for the target moderator assignment. Clients can use the returned representation to confirm that the one-to-one owner classification now exists for that moderator assignment. Error handling should clearly distinguish missing communities, missing moderator assignments, cross-community mismatches, unauthorized callers, and attempts to create a duplicate owner subtype for an assignment that is already marked as owner.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @param props.moderatorId Target moderator assignment's ID within the specified community
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as a transactional community-governance command.
 *
 * 1. Authenticate the caller as a member.
 * 2. Load the community from `community_platform_communities` by `id = :communityId` and reject if not found.
 * 3. Load the target moderator assignment from `community_platform_community_moderators` by `id = :moderatorId` and reject if not found.
 * 4. Verify `community_platform_community_moderators.community_platform_community_id` exactly matches `communityId`; reject on mismatch to enforce community scope.
 * 5. Verify the target moderator assignment is active and not revoked by checking `status`, `revoked_at`, and `deleted_at`. Reject if revoked or deleted.
 * 6. Resolve the caller's owner standing for the same community by locating an active moderator assignment for the caller in the same community and joining to `community_platform_community_moderator_owners`. Reject if the caller does not hold current owner authority in that community.
 * 7. Check whether the target moderator assignment already has an existing row in `community_platform_community_moderator_owners`. Reject duplicate promotion attempts.
 * 8. Insert a new row into `community_platform_community_moderator_owners` with a new UUID, `community_platform_community_moderator_id = :moderatorId`, and current timestamps.
 * 9. Update the parent `community_platform_community_moderators` row if service policy requires the `role` column to reflect owner-linked standing, and persist `updated_at` accordingly.
 * 10. Return the created owner subtype record as the successful response.
 *
 * Implementation must preserve owner-over-moderator hierarchy and community scoping rules from the requirements. Do not allow callers who are merely moderators in the community to perform this promotion unless future requirements explicitly grant that authority. Do not infer any cross-community or platform-wide override.
 *
 * Handle concurrency by relying on the unique constraint on `community_platform_community_moderator_owners.community_platform_community_moderator_id`. If concurrent requests attempt to promote the same assignment, translate the unique-constraint violation into a business conflict indicating that the moderator assignment is already classified as owner. Maintain audit-friendly timestamps from the schema and avoid physically altering unrelated moderator records.
 * @path /communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners
 * @accessor api.functional.communityPlatform.member.communities.moderators.owners.promote
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function promote(
  connection: IConnection,
  props: promote.Props,
): Promise<promote.Response> {
  return true === connection.simulate
    ? promote.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...promote.METADATA,
          path: promote.path(props),
          status: null,
        },
      );
}
export namespace promote {
  export type Props = {
    /**
     * Target community's ID
     */
    communityId: string & tags.Format<"uuid">;

    /**
     * Target moderator assignment's ID within the specified community
     */
    moderatorId: string & tags.Format<"uuid">;
  };
  export type Response = ICommunityPlatformCommunityModeratorOwner;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/communities/:communityId/moderators/:moderatorId/owners",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/moderators/${encodeURIComponent(props.moderatorId ?? "null")}/owners`;
  export const random = (): ICommunityPlatformCommunityModeratorOwner =>
    typia.random<ICommunityPlatformCommunityModeratorOwner>();
  export const simulate = (
    connection: IConnection,
    props: promote.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: promote.path(props),
      contentType: "application/json",
    });
    try {
      assert.param("communityId")(() => typia.assert(props.communityId));
      assert.param("moderatorId")(() => typia.assert(props.moderatorId));
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
