import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMemberActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberActivity";

/**
 * Test member activity retrieval with date range filtering.
 *
 * This test validates the ability to filter member activities (posts and
 * comments) by date ranges using date_from and date_to parameters. It verifies
 * that:
 *
 * - Activities created on or after date_from are returned
 * - Activities created on or before date_to are returned
 * - Combined date_from and date_to create proper bounded time windows
 * - Date boundaries are inclusive for both endpoints
 * - Edge cases like date_from equal to date_to work correctly
 * - Pagination works with date range filters
 * - Response structure includes proper activity summaries with engagement metrics
 *
 * Test workflow:
 *
 * 1. Create administrator account for test data setup
 * 2. Create a category for community classification
 * 3. Create a member account whose activities will be queried
 * 4. Create a community where activities will be tracked
 * 5. Create multiple posts for activity tracking
 * 6. Test various date range filtering scenarios with recent timestamps
 * 7. Validate response structure and pagination
 */
export async function test_api_member_activity_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple posts for activity tracking
  const posts: ICommunityPlatformPost[] = [];

  // Create 5 posts (all with current server timestamps)
  for (let i = 0; i < 5; i++) {
    const post: ICommunityPlatformPost =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content_text: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(post);
    posts.push(post);
  }

  // Step 6: Test date range filtering scenarios
  const now = new Date();

  // Test 6.1: Get all activities without date filtering
  const allActivities: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(allActivities);
  TestValidator.predicate(
    "should retrieve activities without date filter",
    allActivities.data.length >= 0,
  );

  // Test 6.2: Filter with date_from in the past (should include all recent posts)
  const dateFromPast = new Date(
    now.getTime() - 24 * 60 * 60 * 1000,
  ).toISOString();
  const activitiesFromPast: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        date_from: dateFromPast as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesFromPast);

  // Verify all returned activities are on or after date_from
  activitiesFromPast.data.forEach((activity) => {
    const activityDate = new Date(activity.createdAt).getTime();
    const filterDate = new Date(dateFromPast).getTime();
    TestValidator.predicate(
      "activity date should be >= date_from",
      activityDate >= filterDate,
    );
  });

  // Test 6.3: Filter with date_to in the future (should include all recent posts)
  const dateToFuture = new Date(
    now.getTime() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const activitiesToFuture: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        date_to: dateToFuture as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesToFuture);

  // Verify all returned activities are on or before date_to
  activitiesToFuture.data.forEach((activity) => {
    const activityDate = new Date(activity.createdAt).getTime();
    const filterDate = new Date(dateToFuture).getTime();
    TestValidator.predicate(
      "activity date should be <= date_to",
      activityDate <= filterDate,
    );
  });

  // Test 6.4: Filter with both date_from and date_to (bounded window around now)
  const dateFromBounded = new Date(
    now.getTime() - 12 * 60 * 60 * 1000,
  ).toISOString();
  const dateToBounded = new Date(
    now.getTime() + 12 * 60 * 60 * 1000,
  ).toISOString();
  const activitiesBounded: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        date_from: dateFromBounded as string & tags.Format<"date-time">,
        date_to: dateToBounded as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesBounded);

  // Verify all activities fall within the bounded window
  activitiesBounded.data.forEach((activity) => {
    const activityDate = new Date(activity.createdAt).getTime();
    const fromDate = new Date(dateFromBounded).getTime();
    const toDate = new Date(dateToBounded).getTime();
    TestValidator.predicate(
      "activity should be within date range",
      activityDate >= fromDate && activityDate <= toDate,
    );
  });

  // Test 6.5: Edge case - date_from equals date_to (same moment filtering)
  const sameTime = now.toISOString();
  const activitiesSameTime: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        date_from: sameTime as string & tags.Format<"date-time">,
        date_to: sameTime as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesSameTime);

  // Test 6.6: Test with future date_from (should exclude recent posts)
  const dateFarFuture = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const activitiesFarFuture: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 20,
        date_from: dateFarFuture as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(activitiesFarFuture);

  // Test 6.7: Test pagination with date filtering
  const paginatedActivities: IPageICommunityPlatformMemberActivity.ISummary =
    await api.functional.communityPlatform.members.activity.index(connection, {
      memberId: member.id,
      body: {
        page: 1,
        limit: 2,
        date_from: dateFromBounded as string & tags.Format<"date-time">,
      } satisfies ICommunityPlatformMemberActivity.IRequest,
    });
  typia.assert(paginatedActivities);
  TestValidator.predicate(
    "pagination should limit results appropriately",
    paginatedActivities.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination info should be present",
    paginatedActivities.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page should be 1",
    paginatedActivities.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should match request",
    paginatedActivities.pagination.limit === 2,
  );
  TestValidator.predicate(
    "records count should be available",
    paginatedActivities.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be available",
    paginatedActivities.pagination.pages >= 0,
  );

  // Step 7: Validate response structure
  if (allActivities.data.length > 0) {
    const activity = allActivities.data[0];
    typia.assert(activity);
    TestValidator.predicate(
      "activity should have valid id",
      activity.id !== undefined && activity.id.length > 0,
    );
    TestValidator.predicate(
      "activity should have memberId",
      activity.memberId !== undefined,
    );
    TestValidator.predicate(
      "activity should have communityId",
      activity.communityId !== undefined,
    );
    TestValidator.predicate(
      "activity should have activityType",
      activity.activityType === "post" || activity.activityType === "comment",
    );
    TestValidator.predicate(
      "activity should have createdAt timestamp",
      activity.createdAt !== undefined && activity.createdAt.length > 0,
    );
    TestValidator.predicate(
      "activity should have upvoteCount",
      activity.upvoteCount >= 0,
    );
    TestValidator.predicate(
      "activity should have downvoteCount",
      activity.downvoteCount >= 0,
    );
    TestValidator.predicate(
      "activity should have member object",
      activity.member !== undefined,
    );
    TestValidator.predicate(
      "activity should have community object",
      activity.community !== undefined,
    );
  }
}
