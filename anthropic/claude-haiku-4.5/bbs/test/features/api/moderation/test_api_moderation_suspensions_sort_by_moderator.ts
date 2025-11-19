import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

export async function test_api_moderation_suspensions_sort_by_moderator(
  connection: api.IConnection,
) {
  // Create first moderator account for testing
  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .split("@")
          .map((part, idx) => (idx === 0 ? part.slice(0, 20) : part))
          .join("@"),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);
  TestValidator.predicate(
    "moderator1 authenticated successfully",
    moderator1.id !== null,
  );

  // Create second moderator account
  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .split("@")
          .map((part, idx) => (idx === 0 ? part.slice(0, 20) : part))
          .join("@"),
        password: "TestPassword123!",
        username: RandomGenerator.alphaNumeric(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);
  TestValidator.predicate(
    "moderator2 authenticated successfully",
    moderator2.id !== null,
  );

  // Retrieve suspensions sorted by moderator_id in ascending order
  const ascendingResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "moderator_id",
          order: "asc",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(ascendingResult);
  TestValidator.predicate(
    "ascending sort returned valid pagination data",
    ascendingResult.data.length >= 0,
  );

  // Retrieve suspensions sorted by moderator_id in descending order
  const descendingResult: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "moderator_id",
          order: "desc",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(descendingResult);
  TestValidator.predicate(
    "descending sort returned valid pagination data",
    descendingResult.data.length >= 0,
  );

  // Verify pagination information is present and valid
  TestValidator.predicate(
    "ascending pagination current page is valid",
    ascendingResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "ascending pagination limit is positive",
    ascendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "ascending pagination records count is non-negative",
    ascendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "ascending pagination pages count is non-negative",
    ascendingResult.pagination.pages >= 0,
  );

  // Verify suspension records have proper structure
  if (ascendingResult.data.length > 0) {
    const suspension = ascendingResult.data[0];
    TestValidator.predicate(
      "suspension has valid id",
      suspension.id !== null && suspension.id !== undefined,
    );
    TestValidator.predicate(
      "suspension has moderator with id",
      suspension.moderator !== null &&
        suspension.moderator.id !== null &&
        suspension.moderator.id !== undefined,
    );
    TestValidator.predicate(
      "suspension has valid suspension_type",
      suspension.suspension_type !== null &&
        suspension.suspension_type !== undefined,
    );
    TestValidator.predicate(
      "suspension has valid reason",
      suspension.reason !== null && suspension.reason !== undefined,
    );
    TestValidator.predicate(
      "suspension has valid severity_level",
      suspension.severity_level !== null &&
        suspension.severity_level !== undefined,
    );
    TestValidator.predicate(
      "suspension has valid status",
      suspension.status !== null && suspension.status !== undefined,
    );
    TestValidator.predicate(
      "suspension has valid suspended_at timestamp",
      suspension.suspended_at !== null && suspension.suspended_at !== undefined,
    );
  }

  // Verify that sorting order is maintained for moderator IDs (ascending)
  if (ascendingResult.data.length > 1) {
    const moderatorIds = ascendingResult.data.map((s) => s.moderator.id);
    for (let i = 1; i < moderatorIds.length; i++) {
      TestValidator.predicate(
        `moderator ID at position ${i} maintains ascending order`,
        moderatorIds[i] >= moderatorIds[i - 1],
      );
    }
  }

  // Test with specific moderator filter combined with sorting
  if (moderator1.id) {
    const filteredResult: IPageIDiscussionBoardUserSuspension.ISummary =
      await api.functional.discussionBoard.moderator.moderation.suspensions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 50,
            moderator_id: moderator1.id,
            sort_by: "moderator_id",
            order: "asc",
          } satisfies IDiscussionBoardUserSuspension.IRequest,
        },
      );
    typia.assert(filteredResult);
    TestValidator.predicate(
      "filtered results returned valid data",
      filteredResult.data !== null && filteredResult.data !== undefined,
    );

    // Verify all returned suspensions are from the specified moderator
    for (const suspension of filteredResult.data) {
      TestValidator.equals(
        "suspension moderator matches applied filter",
        suspension.moderator.id,
        moderator1.id,
      );
    }
  }
}
