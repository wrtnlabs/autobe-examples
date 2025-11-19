import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

/**
 * Test sorting suspensions by affected contributor ID.
 *
 * A moderator authenticates to the discussion board moderation system and
 * retrieves a list of user suspensions sorted by the affected contributor's ID.
 * This test validates that the API correctly sorts suspension records by
 * contributor_id, enabling moderators to group enforcement history by user and
 * analyze violation patterns per contributor.
 *
 * The test workflow:
 *
 * 1. Create a moderator account through authentication
 * 2. Retrieve suspensions with sort_by='contributor_id' parameter
 * 3. Validate that suspensions are properly sorted and paginated
 * 4. Verify suspension records contain expected fields and structure
 */
export async function test_api_moderation_suspensions_sort_by_contributor(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = "TestPass123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
    } satisfies IDiscussionBoardModerator.ICreate,
  });

  typia.assert(moderator);
  TestValidator.predicate(
    "moderator authentication should succeed",
    moderator.token !== null && moderator.token !== undefined,
  );

  // Step 2: Retrieve suspensions sorted by contributor_id
  const suspensionsPage =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "contributor_id" as const,
          order: "asc" as const,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );

  typia.assert(suspensionsPage);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination should exist",
    suspensionsPage.pagination !== null &&
      suspensionsPage.pagination !== undefined,
  );

  TestValidator.equals(
    "pagination current page should be 1",
    suspensionsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "pagination limit should be 20",
    suspensionsPage.pagination.limit,
    20,
  );

  // Step 4: Validate suspensions data structure
  TestValidator.predicate(
    "suspensions data should be an array",
    Array.isArray(suspensionsPage.data),
  );

  // Step 5: Validate each suspension record has required fields
  if (suspensionsPage.data.length > 0) {
    for (let i = 0; i < suspensionsPage.data.length; i++) {
      const suspension = suspensionsPage.data[i];
      typia.assert(suspension);

      TestValidator.predicate(
        `suspension ${i} should have valid UUID id`,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          suspension.id,
        ),
      );

      TestValidator.predicate(
        `suspension ${i} should have moderator information`,
        suspension.moderator !== null &&
          suspension.moderator !== undefined &&
          suspension.moderator.id !== null &&
          suspension.moderator.username !== null,
      );

      TestValidator.predicate(
        `suspension ${i} should have valid suspension type`,
        ["posting_restriction", "account_suspension", "permanent_ban"].includes(
          suspension.suspension_type,
        ),
      );

      TestValidator.predicate(
        `suspension ${i} should have non-empty reason`,
        suspension.reason !== null &&
          suspension.reason !== undefined &&
          suspension.reason.length > 0,
      );

      TestValidator.predicate(
        `suspension ${i} should have valid severity level`,
        ["minor", "moderate", "severe", "permanent"].includes(
          suspension.severity_level,
        ),
      );

      TestValidator.predicate(
        `suspension ${i} should have valid status`,
        ["active", "lifted", "expired"].includes(suspension.status),
      );

      TestValidator.predicate(
        `suspension ${i} should have valid suspended_at timestamp`,
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.suspended_at),
      );
    }
  }

  // Step 6: Validate response structure integrity
  TestValidator.equals(
    "suspensions response should have pagination and data",
    suspensionsPage.pagination !== null &&
      suspensionsPage.pagination !== undefined &&
      Array.isArray(suspensionsPage.data),
    true,
  );
}
