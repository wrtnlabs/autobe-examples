import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardMember";

/**
 * Test member search with different sorting options.
 *
 * This test validates that moderators can retrieve member lists with various
 * sort parameters and that the results are correctly ordered. It tests:
 *
 * 1. Moderator authentication for member list access
 * 2. Username ascending sort (A-Z)
 * 3. Username descending sort (Z-A)
 * 4. Created_at ascending sort (oldest first)
 * 5. Created_at descending sort (newest first)
 * 6. Default sort behavior when no sort parameter is specified
 *
 * The test ensures moderators can organize member lists according to their
 * workflow needs by validating that each sort option produces correctly ordered
 * results.
 */
export async function test_api_member_search_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.name(2),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve all members with username ascending sort
  const usernameAscResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort: "username",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(usernameAscResult);

  // Step 3: Validate username ascending order
  if (usernameAscResult.data.length > 1) {
    for (let i = 0; i < usernameAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "username ascending order validation",
        usernameAscResult.data[i].username <=
          usernameAscResult.data[i + 1].username,
      );
    }
  }

  // Step 4: Retrieve members with username descending sort
  const usernameDescResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort: "-username",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(usernameDescResult);

  // Step 5: Validate username descending order
  if (usernameDescResult.data.length > 1) {
    for (let i = 0; i < usernameDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "username descending order validation",
        usernameDescResult.data[i].username >=
          usernameDescResult.data[i + 1].username,
      );
    }
  }

  // Step 6: Retrieve members with created_at ascending sort
  const createdAscResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort: "created_at",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(createdAscResult);

  // Step 7: Validate created_at ascending order
  if (createdAscResult.data.length > 1) {
    for (let i = 0; i < createdAscResult.data.length - 1; i++) {
      TestValidator.predicate(
        "created_at ascending order validation",
        new Date(createdAscResult.data[i].created_at).getTime() <=
          new Date(createdAscResult.data[i + 1].created_at).getTime(),
      );
    }
  }

  // Step 8: Retrieve members with created_at descending sort
  const createdDescResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        sort: "-created_at",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(createdDescResult);

  // Step 9: Validate created_at descending order
  if (createdDescResult.data.length > 1) {
    for (let i = 0; i < createdDescResult.data.length - 1; i++) {
      TestValidator.predicate(
        "created_at descending order validation",
        new Date(createdDescResult.data[i].created_at).getTime() >=
          new Date(createdDescResult.data[i + 1].created_at).getTime(),
      );
    }
  }

  // Step 10: Test default sort behavior (no sort parameter)
  const defaultSortResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(defaultSortResult);

  // Step 11: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    defaultSortResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit matches request",
    defaultSortResult.pagination.limit === 100,
  );

  TestValidator.predicate(
    "pagination records is non-negative",
    defaultSortResult.pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages is non-negative",
    defaultSortResult.pagination.pages >= 0,
  );

  // Step 12: Verify different sort orders produce different results
  if (usernameAscResult.data.length > 1) {
    const usernameAscFirst = usernameAscResult.data[0].username;
    const usernameDescFirst = usernameDescResult.data[0].username;

    // If there are different usernames, asc and desc should have different first elements
    const allUsernames = usernameAscResult.data.map((m) => m.username);
    const uniqueUsernames = Array.from(new Set(allUsernames));

    if (uniqueUsernames.length > 1) {
      TestValidator.predicate(
        "username asc and desc produce different ordering",
        usernameAscFirst !== usernameDescFirst ||
          usernameAscResult.data[0].id !== usernameDescResult.data[0].id,
      );
    }
  }
}
