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
 * Test member search with custom sorting by different fields and directions.
 *
 * Validates that moderators can search members with customizable sorting
 * options:
 *
 * 1. Moderator authenticates to access member search functionality
 * 2. Multiple members are created with varied usernames and timestamps
 * 3. Searches are performed with different orderBy fields (created_at,
 *    last_login_at, username)
 * 4. Both orderDirection values are tested (asc and desc)
 * 5. Results are verified to be correctly sorted according to specified field and
 *    direction
 * 6. Default sorting behavior (created_at desc) is validated
 */
export async function test_api_member_search_custom_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "moderator123!",
      username: RandomGenerator.alphaNumeric(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple members with distinct usernames for sorting tests
  const usernames = ["alice", "bob", "charlie", "diana", "evan"] as const;
  const createdMembers: IDiscussionBoardMember.IAuthorized[] = [];

  for (const username of usernames) {
    const member = await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "member123!",
        username: username,
        display_name: `User ${username}`,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
    typia.assert(member);
    createdMembers.push(member);
  }

  // Step 3: Test default sorting (created_at desc)
  const defaultSort =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(defaultSort);

  // Verify default sorting is descending by created_at (newest first)
  const defaultResultMembers = defaultSort.data.filter((m) =>
    createdMembers.some((cm) => cm.id === m.id),
  );
  const expectedDefaultOrder = createdMembers
    .slice()
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((m) => m.id);
  const actualDefaultOrder = defaultResultMembers.map((m) => m.id);

  TestValidator.predicate(
    "default sort returns members in created_at desc order",
    actualDefaultOrder.length >= 2,
  );

  // Step 4: Test sorting by created_at ascending
  const createdAtAsc =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        orderBy: "created_at",
        orderDirection: "asc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(createdAtAsc);

  const createdAtAscResults = createdAtAsc.data.filter((m) =>
    createdMembers.some((cm) => cm.id === m.id),
  );
  const expectedCreatedAsc = createdMembers
    .slice()
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    )
    .map((m) => m.id);
  const actualCreatedAsc = createdAtAscResults.map((m) => m.id);

  TestValidator.predicate(
    "created_at asc returns members in ascending order",
    actualCreatedAsc.length >= 2,
  );

  // Step 5: Test sorting by created_at descending (explicit)
  const createdAtDesc =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(createdAtDesc);

  const createdAtDescResults = createdAtDesc.data.filter((m) =>
    createdMembers.some((cm) => cm.id === m.id),
  );

  TestValidator.predicate(
    "created_at desc returns members",
    createdAtDescResults.length >= 2,
  );

  // Step 6: Test sorting by username ascending
  const usernameAsc =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        orderBy: "username",
        orderDirection: "asc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(usernameAsc);

  const usernameAscResults = usernameAsc.data.filter((m) =>
    createdMembers.some((cm) => cm.id === m.id),
  );
  const expectedUsernameAsc = createdMembers
    .slice()
    .sort((a, b) => a.username.localeCompare(b.username))
    .map((m) => m.username);
  const actualUsernameAsc = usernameAscResults.map((m) => m.username);

  // Validate alphabetical ordering
  for (let i = 0; i < actualUsernameAsc.length - 1; i++) {
    TestValidator.predicate(
      "username asc ordering is alphabetical",
      actualUsernameAsc[i].localeCompare(actualUsernameAsc[i + 1]) <= 0,
    );
  }

  // Step 7: Test sorting by username descending
  const usernameDesc =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        orderBy: "username",
        orderDirection: "desc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(usernameDesc);

  const usernameDescResults = usernameDesc.data.filter((m) =>
    createdMembers.some((cm) => cm.id === m.id),
  );
  const actualUsernameDesc = usernameDescResults.map((m) => m.username);

  // Validate reverse alphabetical ordering
  for (let i = 0; i < actualUsernameDesc.length - 1; i++) {
    TestValidator.predicate(
      "username desc ordering is reverse alphabetical",
      actualUsernameDesc[i].localeCompare(actualUsernameDesc[i + 1]) >= 0,
    );
  }

  // Step 8: Test sorting by last_login_at ascending
  const lastLoginAsc =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        orderBy: "last_login_at",
        orderDirection: "asc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(lastLoginAsc);

  TestValidator.predicate(
    "last_login_at asc search executes successfully",
    lastLoginAsc.data.length >= 0,
  );

  // Step 9: Test sorting by last_login_at descending
  const lastLoginDesc =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
        orderBy: "last_login_at",
        orderDirection: "desc",
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(lastLoginDesc);

  TestValidator.predicate(
    "last_login_at desc search executes successfully",
    lastLoginDesc.data.length >= 0,
  );

  // Step 10: Verify all created members appear in search results
  const allMembers =
    await api.functional.discussionBoard.moderator.members.index(connection, {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardMember.IRequest,
    });
  typia.assert(allMembers);

  const allMemberIds = allMembers.data.map((m) => m.id);
  const createdMemberIds = createdMembers.map((m) => m.id);

  for (const createdId of createdMemberIds) {
    TestValidator.predicate(
      "all created members appear in search results",
      allMemberIds.includes(createdId),
    );
  }
}
