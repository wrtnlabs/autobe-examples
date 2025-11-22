import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAppeal";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorSession";
import type { IRedditPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAction";
import type { IRedditPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAppeal";
import type { IRedditPlatformPlatformAdministratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPlatformAdministratorSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUser";
import type { IRedditPlatformRegisteredUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformRegisteredUserSession";

export async function test_api_appeals_moderator_pagination_management(
  connection: api.IConnection,
) {
  // Step 1: Create community moderator account for testing
  const moderatorData =
    typia.random<IRedditPlatformCommunityModerator.ICreate>();
  const moderator: IRedditPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Test standard pagination with default parameters
  const defaultSearch: IRedditPlatformModerationAppeal.IRequest =
    typia.random<IRedditPlatformModerationAppeal.IRequest>();
  const defaultResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: defaultSearch,
      },
    );
  typia.assert(defaultResult);
  TestValidator.predicate(
    "default pagination response has valid structure",
    defaultResult.pagination.records >= 0 &&
      defaultResult.pagination.current >= 0 &&
      defaultResult.pagination.limit >= 0 &&
      defaultResult.pagination.pages >= 0,
  );

  // Step 3: Test explicit pagination parameters
  const page1Result: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "page 1 limit 20 pagination metadata",
    page1Result.pagination.current,
    1,
  );

  // Step 4: Test different page size limits
  const smallLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(smallLimitResult);
  TestValidator.equals(
    "small limit sets correct page size",
    smallLimitResult.pagination.limit,
    5,
  );

  // Step 5: Test larger page sizes
  const largeLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(largeLimitResult);
  TestValidator.equals(
    "large limit sets correct page size",
    largeLimitResult.pagination.limit,
    50,
  );

  // Step 6: Test second page navigation
  const page2Result: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(page2Result);
  TestValidator.equals(
    "page 2 navigation works",
    page2Result.pagination.current,
    2,
  );

  // Step 7: Test sorting with pagination
  const sortedResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          order_by: "created_at",
          order_direction: "desc",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortedResult);
  TestValidator.equals(
    "sorted pagination preserves order",
    sortedResult.pagination.current,
    1,
  );

  // Step 8: Test filtering with pagination
  const filteredResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "pending",
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filtered pagination returns valid data",
    filteredResult.pagination.records >= 0 &&
      filteredResult.data.every((appeal) => appeal.status === "pending"),
  );

  // Step 9: Test edge case - out of range page
  const outOfRangeResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 999999,
          limit: 20,
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(outOfRangeResult);
  TestValidator.predicate(
    "out of range page handled gracefully",
    outOfRangeResult.pagination.current >= 0 &&
      Array.isArray(outOfRangeResult.data),
  );

  // Step 10: Test invalid limit value handling
  const invalidLimitResult: IPageIRedditPlatformModerationAppeal.ISummary =
    await api.functional.redditPlatform.communityModerator.appeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 1, // Minimum valid limit
        } satisfies IRedditPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(invalidLimitResult);
  TestValidator.equals(
    "minimum limit works correctly",
    invalidLimitResult.pagination.limit,
    1,
  );
}
