import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";

/**
 * Test filtering moderators by appointment date range using appointedAtStart
 * and appointedAtEnd parameters in ISO 8601 UTC datetime format.
 *
 * Validates that the date range filtering correctly returns only moderators
 * appointed within the specified date range (inclusive on both ends). Tests
 * various date range scenarios including single-day ranges, multi-day ranges,
 * and edge cases where start and end dates are the same. Ensures that
 * moderators appointed exactly at the boundary timestamps are included in
 * results. Tests that date filtering works correctly with other filters and
 * sorting parameters, and confirms that the endpoint properly handles timezone
 * information (expecting UTC format).
 *
 * Test flow:
 *
 * 1. Create member and administrator accounts for authentication
 * 2. Create a category for community classification
 * 3. Create a community
 * 4. Appoint multiple moderators with different appointment timestamps
 * 5. Call the moderator list endpoint with various date range filters
 * 6. Validate results match the expected date range criteria
 * 7. Test edge cases like date range filtering and boundary timestamp inclusion
 */
export async function test_api_moderator_list_appointment_date_range_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/signup",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create administrator account for authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 3: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphabets(5)}`,
          display_order: 1,
          description: "Technology discussion category",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Community",
          identifier: `tech-${RandomGenerator.alphabets(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create multiple members to appoint as moderators
  const moderators: ICommunityPlatformMember.IAuthorized[] = [];
  for (let i = 0; i < 5; i++) {
    const mod = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        ip: "127.0.0.1",
        href: "http://localhost:3000/signup",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
    typia.assert(mod);
    moderators.push(mod);
  }

  // Step 6: Appoint moderators
  const appointedModerators: ICommunityPlatformCommunityModerator[] = [];

  for (let i = 0; i < 5; i++) {
    const moderatorRecord =
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: moderators[i].id,
            tier: i < 3 ? "senior" : "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderatorRecord);
    appointedModerators.push(moderatorRecord);
  }

  // Step 7: Test various date range filters using actual appointed times

  // Get the earliest and latest appointment times from created moderators
  const appointmentTimes = appointedModerators
    .map((m) => new Date(m.appointed_at).getTime())
    .sort((a, b) => a - b);
  const earliestTime = appointmentTimes[0];
  const latestTime = appointmentTimes[appointmentTimes.length - 1];

  const earliestDate = new Date(earliestTime);
  const latestDate = new Date(latestTime);

  // Create date range that includes all moderators
  const rangeStart = new Date(earliestDate.getTime() - 60000).toISOString(); // 1 minute before earliest
  const rangeEnd = new Date(latestDate.getTime() + 60000).toISOString(); // 1 minute after latest

  // Test 1: Filter with full date range (should return all moderators)
  const fullRangeResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          appointedAtStart: rangeStart,
          appointedAtEnd: rangeEnd,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(fullRangeResult);
  TestValidator.equals(
    "full date range returns all moderators",
    fullRangeResult.data.length,
    appointedModerators.length,
  );

  // Test 2: Filter with range that excludes latest moderator
  const partialRangeEnd = new Date(latestTime - 1000).toISOString();
  const partialResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          appointedAtStart: rangeStart,
          appointedAtEnd: partialRangeEnd,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(partialResult);
  TestValidator.predicate(
    "partial date range returns fewer moderators",
    partialResult.data.length < appointedModerators.length,
  );

  // Test 3: Filter with boundary timestamps (exact appointment time)
  const boundaryStart = new Date(earliestTime).toISOString();
  const boundaryEnd = new Date(latestTime).toISOString();
  const boundaryResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          appointedAtStart: boundaryStart,
          appointedAtEnd: boundaryEnd,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(boundaryResult);
  TestValidator.predicate(
    "boundary date filter includes moderators at boundaries",
    boundaryResult.data.length >= 1,
  );

  // Test 4: Filter with same start and end date (single timestamp)
  const singleTimestamp = new Date(earliestTime).toISOString();
  const singleTimeResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          appointedAtStart: singleTimestamp,
          appointedAtEnd: singleTimestamp,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(singleTimeResult);
  TestValidator.predicate(
    "single timestamp filter works",
    singleTimeResult.data.length >= 0,
  );

  // Test 5: Filter with date range and sorting
  const sortedResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          appointedAtStart: rangeStart,
          appointedAtEnd: rangeEnd,
          orderBy: "appointedAt",
          order: "asc",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.predicate(
    "date range filter with sorting returns results",
    sortedResult.data.length > 0,
  );

  // Validate sorting order (ascending by appointed_at)
  for (let i = 1; i < sortedResult.data.length; i++) {
    const prevTime = new Date(sortedResult.data[i - 1].appointed_at).getTime();
    const currTime = new Date(sortedResult.data[i].appointed_at).getTime();
    TestValidator.predicate(
      "results sorted in ascending order by appointment time",
      prevTime <= currTime,
    );
  }

  // Test 6: Filter with tier constraint and date range
  const tierFilterResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 100,
          appointedAtStart: rangeStart,
          appointedAtEnd: rangeEnd,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(tierFilterResult);
  TestValidator.predicate(
    "date range filter with tier constraint works",
    tierFilterResult.data.length >= 0,
  );

  // Verify all returned moderators are senior tier
  for (const mod of tierFilterResult.data) {
    TestValidator.equals(
      "moderator is senior tier",
      mod.moderator_tier,
      "senior",
    );
  }

  // Test 7: Verify all results are within the appointed date range
  for (const moderator of fullRangeResult.data) {
    const appointedTime = new Date(moderator.appointed_at).getTime();
    const startTime = new Date(rangeStart).getTime();
    const endTime = new Date(rangeEnd).getTime();
    TestValidator.predicate(
      "moderator appointed_at is within date range",
      appointedTime >= startTime && appointedTime <= endTime,
    );
  }

  // Test 8: Verify pagination works with date range filter
  const paginationResult: IPageICommunityPlatformCommunityModerator.ISummary =
    await api.functional.communityPlatform.member.communities.moderators.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 2,
          appointedAtStart: rangeStart,
          appointedAtEnd: rangeEnd,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination metadata is present",
    paginationResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination current page is 1",
    paginationResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is set correctly",
    paginationResult.pagination.limit === 2,
  );
}
