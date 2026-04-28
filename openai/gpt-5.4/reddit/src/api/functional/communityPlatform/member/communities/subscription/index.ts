import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia, { tags } from "typia";

import { ICommunityPlatformSubscription } from "../../../../../structures/ICommunityPlatformSubscription";

/**
 * Retrieve the authenticated member's subscription relationship for a specific community.
 *
 * This operation returns the current member-to-community membership link recorded in the subscription domain, which the platform defines as the source of truth for whether a community appears in the member's subscribed communities list and whether the member is currently treated as a participant for subscription-dependent behaviors. It is intended for screens such as a community detail page that need to determine whether the signed-in member currently follows the target community identified by `communityId`.
 *
 * The operation is backed primarily by `community_platform_subscriptions`, the table that records that a specific member is subscribed to a specific community. That schema describes the subscription as the authoritative membership link between one `community_platform_members.id` and one `community_platform_communities.id`, with an `active` flag used to determine whether the relationship currently counts as an effective membership link for participation and subscriber totals. The related `community_platform_communities` table provides the canonical identity and lifecycle context for the community itself, including its owner membership reference, presentation fields, and lifecycle timestamps. Because the community schema explicitly states that aggregate values such as subscriber counts are derived from related subscription records, this endpoint focuses on the caller's own relationship record rather than returning derived counts.
 *
 * Security for this operation is member-scoped. Only an authenticated member should call it because the result reflects the caller's personal follow state for the specified community. The member identity must be resolved from the authenticated session rather than from a client-supplied request body field, preventing one member from querying another member's relationship by arbitrary identifier injection. If the target community does not exist or is no longer available for normal access, the operation should fail according to community availability rules rather than fabricating a subscription result.
 *
 * Expected behavior should distinguish clearly between a valid active subscription and the absence of an active subscription. The functional requirements state that subscribed-community views are based on active subscriptions only, that unsubscribed communities are removed from the member's subscribed communities list, and that empty subscription results are not themselves errors when no active subscriptions exist. In this endpoint's detail-style form, implementation should therefore either return the member's current subscription record when one exists for the specified community, or return a not-found style result for the member-scoped subscription resource when no active subscription relationship is present for that community. This operation is closely related to the subscription creation endpoint used when a member chooses to follow a community, and to the subscribed-communities listing endpoint used to browse all followed communities.
 *
 * @param props.connection
 * @param props.communityId Target community's ID
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Authenticate the caller as a member and resolve the
 *   caller's `community_platform_members.id` from the active member session.
 *
 * Validate the `communityId` path parameter as a UUID. Query `community_platform_communities` by `id = :communityId` and ensure the community exists. The community schema includes lifecycle fields `status` and `deleted_at`; use them to reject communities that should not be treated as normally available if domain policy requires availability checks before subscription lookup.
 *
 * Query `community_platform_subscriptions` for the unique member-community pair using `community_platform_member_id = :memberId` and `community_platform_community_id = :communityId`. Because the schema has a unique constraint on this pair, at most one row should exist. Treat `active = true` and `deleted_at IS NULL` as the effective subscribed state. If a row is missing, inactive, or logically removed, return a not-found error for this member-scoped subscription resource instead of synthesizing a fake active subscription.
 *
 * On success, return the subscription entity mapped to `ICommunityPlatformSubscription`. Include fields necessary to represent the subscription identity, target community linkage, effective active state, and audit timestamps according to the DTO definition generated from the schema. Do not require the client to provide member identifiers in the request body or query string.
 *
 * Implementation should not modify subscriber totals here. Subscriber counts are derived from current active subscriptions and are affected only by subscription creation or removal workflows. This endpoint is read-only and should execute without transactional writes. Log authorization failures, invalid UUID input, missing community records, and missing active subscription records through the standard error pipeline.
 * @path /communityPlatform/member/communities/:communityId/subscription
 * @accessor api.functional.communityPlatform.member.communities.subscription.at
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
  };
  export type Response = ICommunityPlatformSubscription;

  export const METADATA = {
    method: "GET",
    path: "/communityPlatform/member/communities/:communityId/subscription",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/subscription`;
  export const random = (): ICommunityPlatformSubscription =>
    typia.random<ICommunityPlatformSubscription>();
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
 * Permanently remove the current member's subscription to a specific community.
 *
 * This operation allows an authenticated member to stop following a community identified by `communityId`. In business terms, a subscription is the active membership link between one member and one community, and the `community_platform_subscriptions` table is the source of truth for whether that relationship currently counts as an effective membership. Executing this endpoint ends that membership relationship for the current member only, so the member is no longer treated as subscribed for subscription-dependent behaviors such as followed-community management and participation checks that depend on active membership.
 *
 * The target community is resolved through the `community_platform_communities` record referenced by the path parameter. That table stores the community's canonical identity, owner membership reference, descriptive presentation fields, and lifecycle state used for discovery and participation decisions. The actual membership removal is applied to the matching `community_platform_subscriptions` record for the authenticated member and the specified community. Because subscriber totals are intentionally not stored on the community table and must be derived from related records, the visible subscriber count changes as a consequence of this subscription record no longer being counted among current active subscriptions.
 *
 * Only authenticated members are allowed to use this operation. Guests may browse public communities and related content, but subscription changes are member-only actions. After completion, the member must retain the ability to browse and read the community's content subject to normal public viewing rules; only the active membership link is removed. This operation affects only the current member's relationship to the specified community and must not alter subscriptions to any other communities.
 *
 * Validation must ensure that the referenced community exists and that the current member has an active subscription to it at the time of processing. If there is no active subscription for that member-community pair, the request must be rejected according to the business unsubscribe rules, and processing must not produce an invalid negative membership effect. If the community is missing, the operation should fail without changing any membership data. This endpoint is commonly used together with the subscribed-communities listing operation that shows all communities the member currently follows, and with community detail or listing operations that present subscriber counts derived from active subscriptions.
 *
 * @param props.connection
 * @param props.communityId Target community's unique identifier.
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Authenticate the caller as a member and obtain the
 *   current member identifier from the session context.
 *
 * Validate that the `communityId` path parameter is a UUID and load the target record from `community_platform_communities` by `id`. Reject the request if no matching community exists or if the community is not available for subscription management according to its lifecycle rules.
 *
 * Within a transaction, query `community_platform_subscriptions` for the unique member-community pair using `community_platform_member_id = currentMemberId` and `community_platform_community_id = communityId`. Treat this table as the authoritative source of truth for membership state. Confirm that the located record represents an active subscription. If no record exists or the subscription is not active, reject the request and do not modify any community count state.
 *
 * Remove the member's effective subscription to the community by updating the located subscription so it is no longer counted as active membership. Implementation may either hard-delete the row or mark it inactive and set lifecycle metadata consistent with the persistence strategy, but the post-condition must be that the member is no longer treated as subscribed and that active-subscription queries exclude the relationship. Ensure that only this single member-community relationship is changed.
 *
 * After commit, subsequent subscribed-community list queries for the member must no longer include this community, and community subscriber totals derived from active subscriptions must no longer count this membership. Preserve the member's ability to browse and read community content after unsubscribe. Return success with no response body when the removal is completed.
 * @path /communityPlatform/member/communities/:communityId/subscription
 * @accessor api.functional.communityPlatform.member.communities.subscription.erase
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
  };

  export const METADATA = {
    method: "DELETE",
    path: "/communityPlatform/member/communities/:communityId/subscription",
    request: null,
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = (props: Props) =>
    `/communityPlatform/member/communities/${encodeURIComponent(props.communityId ?? "null")}/subscription`;
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
