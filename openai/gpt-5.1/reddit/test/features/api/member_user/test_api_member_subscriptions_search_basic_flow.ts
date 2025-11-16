import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";

/**
 * Validate member user subscription search basic flow.
 *
 * Business goal
 *
 * - Ensure an authenticated member user can:
 *
 *   - Join the platform
 *   - Create communities
 *   - Subscribe to specific communities
 *   - Search their subscriptions with filters and pagination via PATCH
 *       /communityPlatform/memberUser/subscriptions
 *   - Receive correct paginated summaries scoped to their own subscriptions and
 *       filter criteria.
 *
 * Scenario steps
 *
 * 1. Join as a new member user using /auth/memberUser/join.
 * 2. Using the authenticated context of that member, create two distinct
 *    communities via /communityPlatform/memberUser/communities.
 * 3. Create subscriptions for both communities for this member using
 *    /communityPlatform/memberUser/members/{memberUserId}/subscriptions.
 * 4. Call PATCH /communityPlatform/memberUser/subscriptions with a filter by the
 *    first community id, requesting a specific page and limit.
 * 5. Verify:
 *
 *    - The response structure conforms to
 *         IPageICommunityPlatformCommunitySubscription.ISummary.
 *    - Pagination.current and pagination.limit equal the requested values.
 *    - At least one subscription summary is returned.
 *    - At least one entry has community.id matching the first community id and
 *         member_user.id matching the joined member user id.
 *    - Receive_notifications in that summary matches what was stored on creation for
 *         that subscription.
 *    - All returned summaries have community.id equal to the filtered community id
 *         (no unrelated subscriptions).
 * 6. Repeat step 4/5 for the second community id to ensure filter behavior is
 *    consistent across multiple subscriptions.
 */
export async function test_api_member_subscriptions_search_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join as a new member user
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    // ip is optional and can be omitted; when omitted, server derives it
    ip: null,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const authorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const memberUserId = authorized.id;

  // 2. Create two distinct communities as this member
  const communityCreateBody1 = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody1 },
    );
  typia.assert(community1);

  const communityCreateBody2 = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody2 },
    );
  typia.assert(community2);

  // 3. Create subscriptions for both communities
  const subscriptionCreateBody1 = {
    community_platform_community_id: community1.id,
    is_active: true,
    receive_notifications: true,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription1: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionCreateBody1,
      },
    );
  typia.assert(subscription1);

  const subscriptionCreateBody2 = {
    community_platform_community_id: community2.id,
    is_active: true,
    receive_notifications: false,
  } satisfies ICommunityPlatformCommunitySubscription.ICreate;

  const subscription2: ICommunityPlatformCommunitySubscription =
    await api.functional.communityPlatform.memberUser.members.subscriptions.create(
      connection,
      {
        memberUserId,
        body: subscriptionCreateBody2,
      },
    );
  typia.assert(subscription2);

  // Helper to assert a filtered search for a particular community
  const assertFilteredSearch = async (
    label: string,
    communityId: string & tags.Format<"uuid">,
    expectedReceiveNotifications: boolean,
  ): Promise<void> => {
    const page = 0 satisfies number & tags.Type<"int32">;
    const limit = 10 satisfies number & tags.Type<"int32">;

    const requestBody = {
      page,
      limit,
      order_by: "created_at",
      order_direction: "desc",
      community_id: communityId,
      is_active: true,
      // We do not filter on receive_notifications here to ensure
      // we can assert the stored flag on the result.
    } satisfies ICommunityPlatformCommunitySubscription.IRequest;

    const pageResult: IPageICommunityPlatformCommunitySubscription.ISummary =
      await api.functional.communityPlatform.memberUser.subscriptions.index(
        connection,
        { body: requestBody },
      );
    typia.assert(pageResult);

    const pagination: IPage.IPagination = pageResult.pagination;
    typia.assert(pagination);

    TestValidator.equals(
      `${label} - pagination.current should match requested page`,
      pagination.current,
      page,
    );
    TestValidator.equals(
      `${label} - pagination.limit should match requested limit`,
      pagination.limit,
      limit,
    );

    const data = pageResult.data;
    TestValidator.predicate(
      `${label} - at least one subscription summary returned`,
      data.length > 0,
    );

    // All returned subscriptions must belong to the filtered community
    for (const summary of data) {
      typia.assert(summary);
      TestValidator.equals(
        `${label} - all summaries must match filtered community id`,
        summary.community.id,
        communityId,
      );
    }

    // Find the specific subscription for this member and community
    const matched = data.find(
      (summary) =>
        summary.community.id === communityId &&
        summary.member_user.id === memberUserId,
    );

    TestValidator.predicate(
      `${label} - subscription for member and community should exist`,
      matched !== undefined,
    );

    if (matched !== undefined) {
      TestValidator.equals(
        `${label} - receive_notifications should reflect stored preference`,
        matched.receive_notifications,
        expectedReceiveNotifications,
      );
    }
  };

  // 4 & 5 & 6. Search and validate for the first community
  await assertFilteredSearch("community1 search", community1.id, true);

  // 6 (repeat). Search and validate for the second community
  await assertFilteredSearch("community2 search", community2.id, false);
}
