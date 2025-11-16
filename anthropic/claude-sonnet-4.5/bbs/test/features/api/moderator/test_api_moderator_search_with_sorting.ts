import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test moderator search functionality with various sorting options.
 *
 * This test validates the comprehensive sorting capabilities of the moderator
 * search API. It creates multiple moderator accounts with distinct attributes,
 * then retrieves the moderator list with different sort configurations to
 * verify correct ordering by created_at, username, and email in both ascending
 * and descending directions.
 *
 * Test workflow:
 *
 * 1. Create 5 moderator accounts with controlled usernames and emails
 * 2. Authenticate as the first moderator to access the listing endpoint
 * 3. Test sorting by created_at (ascending and descending)
 * 4. Test sorting by username (ascending and descending)
 * 5. Test sorting by email (ascending and descending)
 * 6. Validate that our created moderators appear in correct relative order
 */
export async function test_api_moderator_search_with_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create multiple moderator accounts with controlled data for sorting validation
  const moderatorData = [
    { username: "alice_mod", email: "alice@example.com" },
    { username: "charlie_mod", email: "charlie@example.com" },
    { username: "bob_mod", email: "bob@example.com" },
    { username: "eve_mod", email: "eve@example.com" },
    { username: "david_mod", email: "david@example.com" },
  ];

  const createdModerators: IDiscussionBoardModerator.IAuthorized[] = [];

  for (const data of moderatorData) {
    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: data.email,
        password: "testPassword123!",
        username: data.username,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    createdModerators.push(moderator);

    // Small delay to ensure distinct created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 2: Authenticate as the first created moderator
  // The join operation already authenticated us, so we're ready to proceed

  // Helper function to filter and extract our test moderators from API response
  const filterOurModerators = (
    response: IPageIDiscussionBoardModerator.ISummary,
  ) => {
    const ourIds = new Set(createdModerators.map((m) => m.id));
    return response.data.filter((m) => ourIds.has(m.id));
  };

  // Step 3: Test sorting by created_at in ascending order
  const sortByCreatedAtAsc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);

  // Validate ascending order by created_at
  const ourModsCreatedAtAsc = filterOurModerators(sortByCreatedAtAsc);
  const expectedAscByCreatedAt = [...createdModerators].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  TestValidator.equals(
    "created_at ascending order count matches",
    ourModsCreatedAtAsc.length,
    createdModerators.length,
  );

  for (let i = 0; i < ourModsCreatedAtAsc.length - 1; i++) {
    const current = new Date(ourModsCreatedAtAsc[i].created_at).getTime();
    const next = new Date(ourModsCreatedAtAsc[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at ascending order is maintained",
      current <= next,
    );
  }

  // Step 4: Test sorting by created_at in descending order
  const sortByCreatedAtDesc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);

  // Validate descending order by created_at
  const ourModsCreatedAtDesc = filterOurModerators(sortByCreatedAtDesc);

  TestValidator.equals(
    "created_at descending order count matches",
    ourModsCreatedAtDesc.length,
    createdModerators.length,
  );

  for (let i = 0; i < ourModsCreatedAtDesc.length - 1; i++) {
    const current = new Date(ourModsCreatedAtDesc[i].created_at).getTime();
    const next = new Date(ourModsCreatedAtDesc[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at descending order is maintained",
      current >= next,
    );
  }

  // Step 5: Test sorting by username in ascending order
  const sortByUsernameAsc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "username",
          order: "asc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByUsernameAsc);

  // Validate ascending order by username
  const ourModsUsernameAsc = filterOurModerators(sortByUsernameAsc);

  TestValidator.equals(
    "username ascending order count matches",
    ourModsUsernameAsc.length,
    createdModerators.length,
  );

  for (let i = 0; i < ourModsUsernameAsc.length - 1; i++) {
    const current = ourModsUsernameAsc[i].username;
    const next = ourModsUsernameAsc[i + 1].username;
    TestValidator.predicate(
      "username ascending order is maintained",
      current.localeCompare(next) <= 0,
    );
  }

  // Step 6: Test sorting by username in descending order
  const sortByUsernameDesc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "username",
          order: "desc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByUsernameDesc);

  // Validate descending order by username
  const ourModsUsernameDesc = filterOurModerators(sortByUsernameDesc);

  TestValidator.equals(
    "username descending order count matches",
    ourModsUsernameDesc.length,
    createdModerators.length,
  );

  for (let i = 0; i < ourModsUsernameDesc.length - 1; i++) {
    const current = ourModsUsernameDesc[i].username;
    const next = ourModsUsernameDesc[i + 1].username;
    TestValidator.predicate(
      "username descending order is maintained",
      current.localeCompare(next) >= 0,
    );
  }

  // Step 7: Test sorting by email in ascending order
  const sortByEmailAsc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "email",
          order: "asc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByEmailAsc);

  // Validate ascending order by email
  const ourModsEmailAsc = filterOurModerators(sortByEmailAsc);

  TestValidator.equals(
    "email ascending order count matches",
    ourModsEmailAsc.length,
    createdModerators.length,
  );

  for (let i = 0; i < ourModsEmailAsc.length - 1; i++) {
    const current = ourModsEmailAsc[i].email;
    const next = ourModsEmailAsc[i + 1].email;
    TestValidator.predicate(
      "email ascending order is maintained",
      current.localeCompare(next) <= 0,
    );
  }

  // Step 8: Test sorting by email in descending order
  const sortByEmailDesc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort: "email",
          order: "desc",
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByEmailDesc);

  // Validate descending order by email
  const ourModsEmailDesc = filterOurModerators(sortByEmailDesc);

  TestValidator.equals(
    "email descending order count matches",
    ourModsEmailDesc.length,
    createdModerators.length,
  );

  for (let i = 0; i < ourModsEmailDesc.length - 1; i++) {
    const current = ourModsEmailDesc[i].email;
    const next = ourModsEmailDesc[i + 1].email;
    TestValidator.predicate(
      "email descending order is maintained",
      current.localeCompare(next) >= 0,
    );
  }
}
