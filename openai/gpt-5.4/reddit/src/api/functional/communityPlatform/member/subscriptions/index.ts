import {
  HttpError,
  IConnection,
  NestiaSimulator,
  PlainFetcher,
} from "@nestia/fetcher";
import typia from "typia";

import { ICommunityPlatformCommunity } from "../../../../structures/ICommunityPlatformCommunity";
import { ICommunityPlatformSubscription } from "../../../../structures/ICommunityPlatformSubscription";
import { IPageICommunityPlatformCommunity } from "../../../../structures/IPageICommunityPlatformCommunity";

/**
 * Create a new subscription that links the authenticated member to a target community.
 *
 * This operation establishes the membership relationship represented by the community_platform_subscriptions table, which is defined as the source of truth for subscribed-community lists, community membership checks, and subscriber counting. In business terms, subscription is more than a simple follow action: it is the relationship that marks a community as joined by the member, adds that community to the member's personalized participation context, and enables downstream features that depend on active membership.
 *
 * Only authenticated members may call this operation. Guests can browse public community content, but the requirements state that personalized home feed behavior and posting eligibility are available only through an active subscription. After this operation succeeds, the subscribed community becomes eligible to appear in the member's followed-community list and can contribute posts to the member's home feed. The newly created membership link also satisfies the subscription prerequisite that the platform checks before allowing the member to create posts in that community.
 *
 * The target community is resolved from client-supplied community identity in the request body and then linked to the authenticated member account derived from the session. The related community_platform_communities record provides the canonical community context, including its platform-wide unique slug, human-readable title, descriptive summary, and lifecycle status. The subscription record itself stores whether the relationship is currently active and maintains standard audit timestamps. Community subscriber totals are not stored on the community record and must be derived from current active subscriptions, so this operation affects those totals indirectly by creating or restoring an active membership link.
 *
 * Validation must enforce the business rule that duplicate active subscriptions must not inflate subscriber counts or create multiple active memberships for the same member in the same community. If the member is already actively subscribed to the target community, the request must be rejected. If the implementation supports reactivating a previously inactive or removed relationship represented by the same unique member-community pair, the operation should restore that existing record to active state instead of creating a second logical membership. Requests targeting a non-existent community or a community that cannot accept participation must fail with a clear error.
 *
 * This operation is commonly used together with the subscription list and home feed APIs. After successful execution, a subsequent subscribed-communities listing should include the community, and the member's home feed should begin drawing eligible posts from it. The operation also has a direct dependency on community existence lookup before the membership link can be created, because the subscription must belong to a valid community context.
 *
 * @param props.connection
 * @param props.body Target community information for the subscription
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Authenticate the caller as a member and resolve the member identity from the active session instead of trusting any client-supplied member identifier.
 *
 * Validate the request body and resolve the target community from the provided community reference, preferring the community slug because community_platform_communities defines slug as a platform-wide unique identifier suitable for lookup operations. Load the target community and verify that it exists and is in a state that can accept subscriptions according to community lifecycle and participation rules.
 *
 * Within a transaction, query community_platform_subscriptions by the unique pair [community_platform_member_id, community_platform_community_id]. If no record exists, insert a new row with a generated UUID primary key, the resolved member ID, the resolved community ID, active = true, created_at = now, updated_at = now, and deleted_at = null. If a record exists and is already active, reject the request as a duplicate active subscription. If a record exists but is inactive or has deleted_at set, reactivate that row by setting active = true, deleted_at = null, and updated_at = now instead of creating a second row.
 *
 * Return the resulting subscription resource after persistence. The response should represent the effective active membership link. Do not store aggregate subscriber totals on community_platform_communities; those counts remain derived from active subscription rows only. Ensure the write is atomic so concurrent duplicate subscribe attempts cannot bypass the unique constraint on the member-community pair.
 *
 * Error handling should distinguish at least: unauthenticated caller, caller not a member, target community not found, target community not eligible for subscription, and already actively subscribed. Logging and tests should verify that a successful subscription immediately makes the community eligible for subscribed-community listings, personalized home feed sourcing, and the posting prerequisite check for that same community.
 * @path /communityPlatform/member/subscriptions
 * @accessor api.functional.communityPlatform.member.subscriptions.create
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
          path: create.path(),
          status: null,
        },
        props.body,
      );
}
export namespace create {
  export type Props = {
    /**
     * Target community information for the subscription
     */
    body: ICommunityPlatformSubscription.ICreate;
  };
  export type Body = ICommunityPlatformSubscription.ICreate;
  export type Response = ICommunityPlatformSubscription;

  export const METADATA = {
    method: "POST",
    path: "/communityPlatform/member/subscriptions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/member/subscriptions";
  export const random = (): ICommunityPlatformSubscription =>
    typia.random<ICommunityPlatformSubscription>();
  export const simulate = (
    connection: IConnection,
    props: create.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: create.path(),
      contentType: "application/json",
    });
    try {
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
 * Retrieve a filtered and paginated list of communities that the authenticated member currently follows.
 *
 * This operation is the member-facing browsing entry point for personal subscriptions. It reads the membership links stored in the subscription relationship table and presents the related communities as followed communities rather than as low-level link records. In business terms, it fulfills the requirement that a member can review where home feed content comes from by listing all communities for which the member currently has an active subscription. When the member has no active subscriptions, the operation returns an empty paginated result and does not treat that condition as an error.
 *
 * The result is derived from the subscription records in community_platform_subscriptions, which store the subscribed member reference, the subscribed community reference, whether the relationship is currently active, and standard audit timestamps. The community details are then resolved from community_platform_communities, which hold each community's canonical identity, platform-wide unique slug, human-readable title, descriptive summary text, and lifecycle state used for discovery and participation decisions. Because aggregate subscriber totals are defined to be derived from active subscriptions rather than stored directly on the community record, any subscriber-related display information associated with the returned communities must be computed from current active membership links.
 *
 * Access to this operation should be limited to authenticated members because the list is based on the caller's own active membership links. The operation must ignore inactive subscriptions and subscriptions that have been cleared as part of account deletion handling. It must also prevent duplicate active membership links from causing duplicate list entries, aligning with the rule that duplicate active subscriptions must not inflate subscriber count for the same member-community pair. Related operations commonly used with this endpoint include the community subscription creation flow that causes a community to begin appearing in this list and the unsubscribe flow that removes the community from this list once the active membership link is removed.
 *
 * This endpoint is intentionally modeled as a search-style list operation so clients can request pagination, sorting, and optional community-oriented filtering without exposing internal subscription row management semantics. Consumers should treat the response as a list of followed community summaries, not as a direct audit view of subscription records.
 *
 * @param props.connection
 * @param props.body Filtering, pagination, and sorting options for followed communities
 * @x-autobe-authorization-type null
 * @x-autobe-authorization-actor member
 * @x-autobe-specification Implement this operation as an authenticated member-scoped list query.
 *
 * 1. Resolve the caller's member identity from the authenticated session context. Do not accept member identity from the request body, query string, or path.
 * 2. Query community_platform_subscriptions as the source of truth for followed communities. Filter rows by community_platform_member_id equal to the authenticated member, active equal to true, and deleted_at equal to null.
 * 3. Join community_platform_communities on community_platform_subscriptions.community_platform_community_id = community_platform_communities.id. Exclude community rows that are not currently available for normal browsing if community lifecycle rules require such filtering; at minimum, do not return communities whose deleted_at is not null.
 * 4. Apply request-body driven list controls from ICommunityPlatformCommunity.IRequest, such as pagination, sorting, and optional community search criteria that are actually supportable by the schema. Valid searchable community fields are grounded in the loaded schema: slug, title, description, status, created_at, and updated_at. Do not invent unsupported filters.
 * 5. Produce community summary items, not subscription entities. Each item should represent a followed community suitable for list displays.
 * 6. For subscriber-related display fields, derive counts from current active subscriptions only by counting community_platform_subscriptions rows for the community where active is true and deleted_at is null. Never rely on a stored subscriber count column because the community schema explicitly states aggregates are not stored there.
 * 7. Ensure the member sees each followed community at most once. The database unique constraint on [community_platform_member_id, community_platform_community_id] should normally guarantee uniqueness, but the service should still shape the result as distinct communities.
 * 8. If no active subscriptions exist for the member, return an empty paginated result with a successful response.
 * 9. Use stable ordering so pagination is deterministic. Default ordering should prefer a predictable field such as subscription created_at descending or a requested supported community sort, with a deterministic tiebreaker.
 * 10. Return standard authorization and existence errors only for authentication or malformed request conditions. Absence of followed communities is not an error case.
 * @path /communityPlatform/member/subscriptions
 * @accessor api.functional.communityPlatform.member.subscriptions.index
 * @autobe Generated by AutoBE - https://github.com/wrtnlabs/autobe
 */
export async function index(
  connection: IConnection,
  props: index.Props,
): Promise<index.Response> {
  return true === connection.simulate
    ? index.simulate(connection, props)
    : await PlainFetcher.fetch(
        {
          ...connection,
          headers: {
            ...connection.headers,
            "Content-Type": "application/json",
          },
        },
        {
          ...index.METADATA,
          path: index.path(),
          status: null,
        },
        props.body,
      );
}
export namespace index {
  export type Props = {
    /**
     * Filtering, pagination, and sorting options for followed communities
     */
    body: ICommunityPlatformCommunity.IRequest;
  };
  export type Body = ICommunityPlatformCommunity.IRequest;
  export type Response = IPageICommunityPlatformCommunity.ISummary;

  export const METADATA = {
    method: "PATCH",
    path: "/communityPlatform/member/subscriptions",
    request: {
      type: "application/json",
      encrypted: false,
    },
    response: {
      type: "application/json",
      encrypted: false,
    },
  } as const;

  export const path = () => "/communityPlatform/member/subscriptions";
  export const random = (): IPageICommunityPlatformCommunity.ISummary =>
    typia.random<IPageICommunityPlatformCommunity.ISummary>();
  export const simulate = (
    connection: IConnection,
    props: index.Props,
  ): Response => {
    const assert = NestiaSimulator.assert({
      method: METADATA.method,
      host: connection.host,
      path: index.path(),
      contentType: "application/json",
    });
    try {
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
