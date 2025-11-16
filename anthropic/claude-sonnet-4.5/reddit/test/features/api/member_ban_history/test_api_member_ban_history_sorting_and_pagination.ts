import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityBan";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_member_ban_history_sorting_and_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create test username for ban history queries
  const testUsername = RandomGenerator.alphaNumeric(12);

  // Step 3: Test sorting by created_at in ascending order
  const ascendingResult =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(ascendingResult);

  // Validate pagination metadata structure
  TestValidator.predicate(
    "pagination metadata should have valid current page",
    ascendingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination metadata should have valid limit",
    ascendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination metadata should have valid records count",
    ascendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination metadata should have valid pages count",
    ascendingResult.pagination.pages >= 0,
  );

  // Step 4: Test sorting by created_at in descending order
  const descendingResult =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(descendingResult);

  // Step 5: Test sorting by expires_at
  const expiresAtSort =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 10,
          sort_by: "expires_at",
          sort_order: "asc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(expiresAtSort);

  // Step 6: Test sorting by community_name
  const communityNameSort =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 10,
          sort_by: "community_name",
          sort_order: "asc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(communityNameSort);

  // Step 7: Test sorting by member_username
  const memberUsernameSort =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 10,
          sort_by: "member_username",
          sort_order: "desc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(memberUsernameSort);

  // Step 8: Test sorting by moderator_username
  const moderatorUsernameSort =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 10,
          sort_by: "moderator_username",
          sort_order: "asc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(moderatorUsernameSort);

  // Step 9: Test pagination with different page sizes
  const smallPageSize =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 5,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(smallPageSize);

  TestValidator.equals(
    "small page size limit should match request",
    smallPageSize.pagination.limit,
    5,
  );

  // Step 10: Test pagination navigation (page 2)
  const page2Result =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 2,
          limit: 10,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(page2Result);

  TestValidator.equals(
    "page 2 current page should be 1 (zero-indexed)",
    page2Result.pagination.current,
    1,
  );

  // Step 11: Test maximum page size limit
  const maxPageSize =
    await api.functional.redditCommunity.moderator.members.bans.index(
      connection,
      {
        username: testUsername,
        body: {
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IRedditCommunityCommunityBan.IRequest,
      },
    );
  typia.assert(maxPageSize);

  TestValidator.equals(
    "max page size limit should be 100",
    maxPageSize.pagination.limit,
    100,
  );

  // Step 12: Validate pagination calculation consistency
  if (ascendingResult.pagination.records > 0) {
    const expectedPages = Math.ceil(
      ascendingResult.pagination.records / ascendingResult.pagination.limit,
    );
    TestValidator.equals(
      "pagination pages calculation should be accurate",
      ascendingResult.pagination.pages,
      expectedPages,
    );
  }
}
