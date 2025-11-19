import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

export async function test_api_moderation_suspensions_filter_by_status_active(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password:
          RandomGenerator.alphabets(8) + "1A!" + RandomGenerator.alphabets(2),
        username: RandomGenerator.alphabets(6),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve suspensions filtered by active status only
  const activeResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          status: "active",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(activeResult);

  // Step 3: Validate pagination structure
  TestValidator.predicate(
    "pagination info should be present",
    activeResult.pagination !== null && activeResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination should have required fields",
    activeResult.pagination.current >= 1 &&
      activeResult.pagination.limit >= 1 &&
      activeResult.pagination.records >= 0 &&
      activeResult.pagination.pages >= 0,
  );

  // Step 4: Validate response data structure
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(activeResult.data),
  );

  // Step 5: Validate each suspension has active status only
  if (activeResult.data.length > 0) {
    for (const suspension of activeResult.data) {
      TestValidator.equals(
        "suspension status should be active",
        suspension.status,
        "active",
      );
      TestValidator.predicate(
        "active suspension must have suspended_at timestamp",
        suspension.suspended_at !== null &&
          suspension.suspended_at !== undefined &&
          suspension.suspended_at.length > 0,
      );
      TestValidator.predicate(
        "moderator information should be present",
        suspension.moderator !== null &&
          suspension.moderator !== undefined &&
          suspension.moderator.id.length > 0,
      );
      TestValidator.predicate(
        "suspension type should be valid",
        ["posting_restriction", "account_suspension", "permanent_ban"].includes(
          suspension.suspension_type,
        ),
      );
      TestValidator.predicate(
        "severity level should be valid",
        ["minor", "moderate", "severe", "permanent"].includes(
          suspension.severity_level,
        ),
      );
    }
  }

  // Step 6: Validate that lifted suspensions are excluded
  const allResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(allResult);

  const liftedCount = allResult.data.filter(
    (s) => s.status === "lifted",
  ).length;
  const expiredCount = allResult.data.filter(
    (s) => s.status === "expired",
  ).length;

  TestValidator.predicate(
    "active result should not include lifted suspensions",
    !activeResult.data.some((s) => s.status === "lifted"),
  );
  TestValidator.predicate(
    "active result should not include expired suspensions",
    !activeResult.data.some((s) => s.status === "expired"),
  );

  // Step 7: Validate that filtering works correctly
  const activeCount = activeResult.data.length;
  TestValidator.predicate(
    "total suspensions should be >= active count",
    allResult.data.length >= activeCount,
  );
}
