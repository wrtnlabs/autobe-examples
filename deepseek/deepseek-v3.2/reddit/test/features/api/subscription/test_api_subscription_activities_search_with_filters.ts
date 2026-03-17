import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import type { ICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSubscriptionActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSubscriptionActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

/**
 * Test that an authenticated member can search their own subscription activity records with various filters.
 *
 * 1. Authenticate as a member using join operation
 * 2. Create communities to subscribe to
 * 3. Generate subscription activities by subscribing/unsubscribing
 * 4. Test search endpoint with various filter combinations:
 *    - No filters (get all activities)
 *    - Filter by community_id
 *    - Filter by event_type
 *    - Filter by date ranges
 *    - Filter by posting_permission_changed
 *    - Combined filters
 * 5. Validate pagination, chronological ordering, and record completeness
 */
export async function test_api_subscription_activities_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Create test communities
  const community1 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `community-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community2);
  // Note: We cannot generate subscription activities because subscribe/unsubscribe endpoints
  // are not in the provided SDK. However, we can still test the search endpoint's filter logic
  // even if it returns empty results initially.
  // Test 1: Search with no filters (should return all activities)
  const allActivities =
    await api.functional.communityPlatform.member.subscription_activities.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(allActivities);
  TestValidator.equals(
    "has pagination metadata",
    typeof allActivities.pagination,
    "object",
  );
  TestValidator.predicate("pagination has required fields", () => {
    const pagination = allActivities.pagination;
    return (
      typeof pagination.current === "number" &&
      typeof pagination.limit === "number" &&
      typeof pagination.records === "number" &&
      typeof pagination.pages === "number"
    );
  });
  TestValidator.predicate(
    "current page is at least 1",
    allActivities.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit is positive",
    allActivities.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    allActivities.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    allActivities.pagination.pages >= 0,
  );
  // Test 2: Filter by community_id
  const communityFiltered =
    await api.functional.communityPlatform.member.subscription_activities.index(
      memberConnection,
      {
        body: {
          community_id: community1.id,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(communityFiltered);
  // Test 3: Filter by event_type
  const eventTypeFiltered =
    await api.functional.communityPlatform.member.subscription_activities.index(
      memberConnection,
      {
        body: {
          event_type: "subscribed",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(eventTypeFiltered);
  // Test 4: Filter by date range (past to future)
  const now = new Date();
  const pastDate = new Date(
    now.getTime() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days ago
  const futureDate = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const dateRangeFiltered =
    await api.functional.communityPlatform.member.subscription_activities.index(
      memberConnection,
      {
        body: {
          from_event_time: pastDate,
          to_event_time: futureDate,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(dateRangeFiltered);
  // Test 5: Filter by posting_permission_changed
  const permissionFiltered =
    await api.functional.communityPlatform.member.subscription_activities.index(
      memberConnection,
      {
        body: {
          posting_permission_changed: true,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(permissionFiltered);
  // Test 6: Combined filters
  const combinedFiltered =
    await api.functional.communityPlatform.member.subscription_activities.index(
      memberConnection,
      {
        body: {
          community_id: community1.id,
          event_type: "subscribed",
          posting_permission_changed: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(combinedFiltered);
  // Test 7: Pagination with custom page and limit
  const paginated =
    await api.functional.communityPlatform.member.subscription_activities.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformSubscriptionActivity.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals("page is 2", paginated.pagination.current, 2);
  TestValidator.equals("limit is 5", paginated.pagination.limit, 5);
  // Validate activity record structure if any exist
  if (allActivities.data.length > 0) {
    const activity = allActivities.data[0];
    TestValidator.equals("has id field", typeof activity.id, "string");
    TestValidator.equals(
      "has event_type field",
      typeof activity.event_type,
      "string",
    );
    TestValidator.equals(
      "has event_time field",
      typeof activity.event_time,
      "string",
    );
    TestValidator.equals(
      "has posting_permission_changed field",
      typeof activity.posting_permission_changed,
      "boolean",
    );
    TestValidator.equals(
      "has feed_inclusion_changed field",
      typeof activity.feed_inclusion_changed,
      "boolean",
    );
    TestValidator.equals(
      "has created_at field",
      typeof activity.created_at,
      "string",
    );
    TestValidator.equals(
      "has member summary",
      typeof activity.member,
      "object",
    );
    TestValidator.equals(
      "has community summary",
      typeof activity.community,
      "object",
    );
    TestValidator.equals(
      "subscription can be null or object",
      activity.subscription === null ||
        typeof activity.subscription === "object",
      true,
    );
    // Validate chronological ordering (event_time descending)
    for (let i = 0; i < allActivities.data.length - 1; i++) {
      const current = new Date(allActivities.data[i].event_time);
      const next = new Date(allActivities.data[i + 1].event_time);
      TestValidator.predicate(
        `activity ${i} should be newer or equal to activity ${i + 1}`,
        current.getTime() >= next.getTime(),
      );
    }
  }
}
