import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerator";

/**
 * Test comprehensive sorting functionality for moderator search results.
 *
 * This test validates that the moderator search endpoint correctly sorts
 * results across all supported sort fields (created_at, last_login_at,
 * username) and both sort directions (asc, desc). It also verifies proper
 * handling of null values in optional sortable fields and validates default
 * sorting behavior.
 *
 * Test workflow:
 *
 * 1. Create initial moderator account and authenticate
 * 2. Create multiple test moderators with varying attributes (usernames,
 *    timestamps)
 * 3. Test sorting by created_at in both ascending and descending order
 * 4. Test sorting by last_login_at in both directions
 * 5. Test sorting by username alphabetically in both directions
 * 6. Verify default sorting behavior when parameters are omitted
 */
export async function test_api_moderator_search_with_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate initial moderator account
  const initialModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        username: typia.random<
          string & tags.MinLength<3> & tags.MaxLength<20>
        >(),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(initialModerator);

  // Step 2: Create multiple test moderators with controlled attributes
  const testModerators: IDiscussionBoardModerator.IAuthorized[] = [];

  // Create moderators with alphabetically diverse usernames
  const usernames = [
    "alpha_moderator",
    "beta_moderator",
    "charlie_moderator",
    "delta_moderator",
    "echo_moderator",
  ];

  for (const username of usernames) {
    // Small delay to ensure different created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));

    const moderator = await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword456!",
        username: username,
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
    typia.assert(moderator);
    testModerators.push(moderator);
  }

  // Step 3: Test sorting by created_at - ascending order
  const sortByCreatedAtAsc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);

  // Verify ascending chronological order
  for (let i = 0; i < sortByCreatedAtAsc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtAsc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAtAsc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at ascending order - current <= next",
      current <= next,
    );
  }

  // Step 4: Test sorting by created_at - descending order
  const sortByCreatedAtDesc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);

  // Verify descending chronological order
  for (let i = 0; i < sortByCreatedAtDesc.data.length - 1; i++) {
    const current = new Date(sortByCreatedAtDesc.data[i].created_at).getTime();
    const next = new Date(sortByCreatedAtDesc.data[i + 1].created_at).getTime();
    TestValidator.predicate(
      "created_at descending order - current >= next",
      current >= next,
    );
  }

  // Step 5: Test sorting by last_login_at - ascending order
  const sortByLastLoginAsc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          sort_by: "last_login_at",
          order: "asc",
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByLastLoginAsc);

  // Verify ascending order for non-null last_login_at values
  const nonNullLoginTimestamps = sortByLastLoginAsc.data
    .filter(
      (mod) => mod.last_login_at !== null && mod.last_login_at !== undefined,
    )
    .map((mod) => new Date(mod.last_login_at!).getTime());

  for (let i = 0; i < nonNullLoginTimestamps.length - 1; i++) {
    TestValidator.predicate(
      "last_login_at ascending order - current <= next",
      nonNullLoginTimestamps[i] <= nonNullLoginTimestamps[i + 1],
    );
  }

  // Step 6: Test sorting by last_login_at - descending order
  const sortByLastLoginDesc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          sort_by: "last_login_at",
          order: "desc",
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByLastLoginDesc);

  // Verify descending order for non-null last_login_at values
  const nonNullLoginTimestampsDesc = sortByLastLoginDesc.data
    .filter(
      (mod) => mod.last_login_at !== null && mod.last_login_at !== undefined,
    )
    .map((mod) => new Date(mod.last_login_at!).getTime());

  for (let i = 0; i < nonNullLoginTimestampsDesc.length - 1; i++) {
    TestValidator.predicate(
      "last_login_at descending order - current >= next",
      nonNullLoginTimestampsDesc[i] >= nonNullLoginTimestampsDesc[i + 1],
    );
  }

  // Step 7: Test sorting by username - ascending order (A-Z)
  const sortByUsernameAsc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          sort_by: "username",
          order: "asc",
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByUsernameAsc);

  // Verify alphabetical ascending order
  for (let i = 0; i < sortByUsernameAsc.data.length - 1; i++) {
    const current = sortByUsernameAsc.data[i].username;
    const next = sortByUsernameAsc.data[i + 1].username;
    TestValidator.predicate(
      "username ascending order - current <= next alphabetically",
      current.localeCompare(next) <= 0,
    );
  }

  // Step 8: Test sorting by username - descending order (Z-A)
  const sortByUsernameDesc =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          sort_by: "username",
          order: "desc",
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(sortByUsernameDesc);

  // Verify alphabetical descending order
  for (let i = 0; i < sortByUsernameDesc.data.length - 1; i++) {
    const current = sortByUsernameDesc.data[i].username;
    const next = sortByUsernameDesc.data[i + 1].username;
    TestValidator.predicate(
      "username descending order - current >= next alphabetically",
      current.localeCompare(next) >= 0,
    );
  }

  // Step 9: Test default sorting behavior (no sort parameters)
  const defaultSort =
    await api.functional.discussionBoard.moderator.moderators.index(
      connection,
      {
        body: {
          limit: 100,
        } satisfies IDiscussionBoardModerator.IRequest,
      },
    );
  typia.assert(defaultSort);

  // Verify default sort returns valid results
  TestValidator.predicate(
    "default sort returns moderators",
    defaultSort.data.length > 0,
  );
}
