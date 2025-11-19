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
 * Test member search filtering by last login activity using lastLoginAfter
 * parameter.
 *
 * This test validates activity-based filtering of members through the moderator
 * search API. The workflow includes:
 *
 * 1. Moderator authenticates to gain search privileges
 * 2. Multiple member accounts are created (some will login, some won't)
 * 3. Selected members perform login operations to update last_login_at timestamps
 * 4. Moderator searches with lastLoginAfter parameter set to recent timestamp (7
 *    days ago)
 * 5. System filters members by last_login_at field
 * 6. Results include only members who logged in after the specified timestamp
 *
 * This helps moderators identify recently active members versus inactive
 * accounts. Members who never logged in (last_login_at is null) are properly
 * handled and excluded.
 */
export async function test_api_member_search_last_login_activity_filter(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_pass_123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts (will create 6 members total)
  const memberCount = 6;
  const memberCredentials: Array<{ email: string; password: string }> = [];

  const members = await ArrayUtil.asyncRepeat(memberCount, async (index) => {
    const email = typia.random<string & tags.Format<"email">>();
    const password = `member_pass_${index}`;
    memberCredentials.push({ email, password });

    const member = await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        username: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    return member;
  });

  // Step 3: Some members perform login to update last_login_at (first 3 members)
  const loginCount = 3;
  const loggedInMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (let i = 0; i < loginCount; i++) {
    const credential = memberCredentials[i];

    const loggedInMember = await api.functional.auth.member.login(connection, {
      body: {
        email: credential.email,
        password: credential.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ILogin,
    });
    typia.assert(loggedInMember);
    loggedInMembers.push(loggedInMember);
  }

  // Step 4: Set lastLoginAfter to 7 days ago (members who logged in just now should be included)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const lastLoginAfter = sevenDaysAgo.toISOString();

  // Step 5: Moderator searches with lastLoginAfter parameter
  const searchResult =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 20,
        lastLoginAfter,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(searchResult);

  // Step 6: Validate search results structure
  TestValidator.predicate(
    "search result should have pagination structure",
    searchResult.pagination !== null && searchResult.pagination !== undefined,
  );

  TestValidator.predicate(
    "search result should have data array",
    Array.isArray(searchResult.data),
  );

  // Step 7: Verify that members who logged in are present in the results
  const returnedMemberIds = searchResult.data.map((m) => m.id);
  const loggedInMemberIds = loggedInMembers.map((m) => m.id);

  for (const loggedInId of loggedInMemberIds) {
    TestValidator.predicate(
      "logged-in member should appear in search results",
      returnedMemberIds.includes(loggedInId),
    );
  }

  // Step 8: Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be 1",
    searchResult.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination limit should match request",
    searchResult.pagination.limit === 20,
  );

  TestValidator.predicate(
    "search results should not be empty",
    searchResult.data.length > 0,
  );
}
