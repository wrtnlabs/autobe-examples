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
 * Test filtering suspensions by expired status.
 *
 * A moderator authenticates and retrieves suspension records filtered by
 * status='expired', which represents naturally concluded restrictions that have
 * passed their expiration_at timestamp. This test validates the ability to
 * query and analyze completed enforcement actions.
 *
 * Steps:
 *
 * 1. Create and authenticate a moderator account
 * 2. Query suspensions filtered by status='expired'
 * 3. Validate pagination structure and response format
 * 4. Verify all returned suspensions have status='expired'
 * 5. Confirm suspensions have valid expiration_at timestamps
 * 6. Validate moderator information is included
 */
export async function test_api_moderation_suspensions_filter_by_status_expired(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(10);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: moderatorUsername,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  TestValidator.predicate(
    "moderator should be authenticated with token",
    moderator.token?.access !== undefined && moderator.token?.access.length > 0,
  );

  // Step 2: Query suspensions filtered by status='expired'
  const expiredSuspensionsPage =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          status: "expired",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(expiredSuspensionsPage);

  // Step 3: Validate pagination structure and response format
  TestValidator.predicate(
    "pagination should contain valid page information",
    expiredSuspensionsPage.pagination !== undefined,
  );

  TestValidator.equals(
    "current page should be 1",
    expiredSuspensionsPage.pagination.current,
    1,
  );

  TestValidator.equals(
    "limit should be 20",
    expiredSuspensionsPage.pagination.limit,
    20,
  );

  TestValidator.predicate(
    "total records should be non-negative",
    expiredSuspensionsPage.pagination.records >= 0,
  );

  TestValidator.predicate(
    "total pages should be non-negative",
    expiredSuspensionsPage.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "data should be an array",
    Array.isArray(expiredSuspensionsPage.data),
  );

  // Step 4: Verify all returned suspensions have status='expired'
  if (expiredSuspensionsPage.data.length > 0) {
    const allExpired = expiredSuspensionsPage.data.every(
      (suspension) => suspension.status === "expired",
    );

    TestValidator.predicate(
      "all returned suspensions should have status='expired'",
      allExpired,
    );

    // Step 5: Confirm suspensions have valid expiration_at timestamps
    for (const suspension of expiredSuspensionsPage.data) {
      typia.assert(suspension);

      TestValidator.predicate(
        `suspension ${suspension.id} should have expiration_at timestamp`,
        suspension.expiration_at !== undefined &&
          suspension.expiration_at !== null,
      );

      if (suspension.expiration_at) {
        const expirationDate = new Date(suspension.expiration_at);
        TestValidator.predicate(
          `suspension ${suspension.id} expiration_at should be a valid date`,
          !isNaN(expirationDate.getTime()),
        );
      }

      // Step 6: Validate moderator information is included
      TestValidator.predicate(
        `suspension ${suspension.id} should have moderator information`,
        suspension.moderator !== undefined &&
          suspension.moderator.id !== undefined &&
          suspension.moderator.username !== undefined,
      );

      TestValidator.predicate(
        `suspension ${suspension.id} should have suspension_type`,
        suspension.suspension_type !== undefined &&
          [
            "posting_restriction",
            "account_suspension",
            "permanent_ban",
          ].includes(suspension.suspension_type),
      );

      TestValidator.predicate(
        `suspension ${suspension.id} should have severity_level`,
        suspension.severity_level !== undefined &&
          ["minor", "moderate", "severe", "permanent"].includes(
            suspension.severity_level,
          ),
      );

      TestValidator.predicate(
        `suspension ${suspension.id} should have reason`,
        typeof suspension.reason === "string" &&
          suspension.reason.length > 0 &&
          suspension.reason.length <= 1000,
      );

      TestValidator.predicate(
        `suspension ${suspension.id} should have suspended_at timestamp`,
        suspension.suspended_at !== undefined &&
          new Date(suspension.suspended_at).getTime() > 0,
      );
    }
  }

  // Additional test: Query with pagination
  const secondPage =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 2,
          limit: 10,
          status: "expired",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page current should be 2",
    secondPage.pagination.current,
    2,
  );

  TestValidator.equals(
    "second page limit should be 10",
    secondPage.pagination.limit,
    10,
  );
}
