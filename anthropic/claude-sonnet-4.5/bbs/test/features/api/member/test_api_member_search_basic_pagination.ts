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
 * Test basic member search with pagination returning paginated member summary
 * list.
 *
 * This test validates fundamental search functionality for moderators:
 *
 * 1. Moderator authenticates to obtain access token
 * 2. Multiple members are registered to create test data
 * 3. Moderator performs member search with page=1 and limit=10
 * 4. System queries discussion_board_members table and returns paginated results
 * 5. Response includes pagination metadata and member summary data array
 * 6. Default ordering by created_at descending shows newest members first
 */
export async function test_api_member_search_basic_pagination(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        username: RandomGenerator.alphaNumeric(8),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts to populate member list
  const memberCount = 15;
  await ArrayUtil.asyncRepeat(memberCount, async () => {
    const memberEmail = typia.random<string & tags.Format<"email">>();
    const member: IDiscussionBoardMember.IAuthorized =
      await api.functional.auth.member.join(connection, {
        body: {
          email: memberEmail,
          password: "member123",
          username: RandomGenerator.alphaNumeric(10),
          display_name: RandomGenerator.name(),
          bio: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardMember.ICreate,
      });
    typia.assert(member);
  });

  // Step 3: Perform member search with pagination (moderator already authenticated)
  const searchResult: IPageIDiscussionBoardMember.ISummary =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "current page should be 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.equals("limit should be 10", searchResult.pagination.limit, 10);
  TestValidator.predicate(
    "total records should be at least 15",
    searchResult.pagination.records >= memberCount,
  );
  TestValidator.predicate(
    "total pages should be at least 2",
    searchResult.pagination.pages >= 2,
  );

  // Step 5: Validate member summary data array
  TestValidator.predicate(
    "data array should contain members",
    searchResult.data.length > 0,
  );
  TestValidator.predicate(
    "data array should not exceed limit",
    searchResult.data.length <= 10,
  );

  // Step 6: Validate each member summary structure
  for (const memberSummary of searchResult.data) {
    typia.assert(memberSummary);
  }
}
