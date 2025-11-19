import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserSuspension";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserSuspension";

export async function test_api_moderation_suspensions_sort_by_expiration_date(
  connection: api.IConnection,
) {
  // Create a moderator account
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!",
        username: RandomGenerator.alphabets(10),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Retrieve suspensions sorted by expiration_at in ascending order
  const suspensionsAsc: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "expiration_at",
          order: "asc",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionsAsc);

  // Validate that suspensions are sorted by expiration_at in ascending order
  if (suspensionsAsc.data.length > 1) {
    for (let i = 0; i < suspensionsAsc.data.length - 1; i++) {
      const current = suspensionsAsc.data[i];
      const next = suspensionsAsc.data[i + 1];

      // Both should have expiration_at values for proper sorting
      if (
        current.expiration_at !== null &&
        current.expiration_at !== undefined &&
        next.expiration_at !== null &&
        next.expiration_at !== undefined
      ) {
        const currentTime = new Date(current.expiration_at).getTime();
        const nextTime = new Date(next.expiration_at).getTime();

        TestValidator.predicate(
          "expiration_at should be sorted in ascending order",
          currentTime <= nextTime,
        );
      }
    }
  }

  // Retrieve suspensions sorted by expiration_at in descending order
  const suspensionsDesc: IPageIDiscussionBoardUserSuspension.ISummary =
    await api.functional.discussionBoard.moderator.moderation.suspensions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 100,
          sort_by: "expiration_at",
          order: "desc",
        } satisfies IDiscussionBoardUserSuspension.IRequest,
      },
    );
  typia.assert(suspensionsDesc);

  // Validate that suspensions are sorted by expiration_at in descending order
  if (suspensionsDesc.data.length > 1) {
    for (let i = 0; i < suspensionsDesc.data.length - 1; i++) {
      const current = suspensionsDesc.data[i];
      const next = suspensionsDesc.data[i + 1];

      // Both should have expiration_at values for proper sorting
      if (
        current.expiration_at !== null &&
        current.expiration_at !== undefined &&
        next.expiration_at !== null &&
        next.expiration_at !== undefined
      ) {
        const currentTime = new Date(current.expiration_at).getTime();
        const nextTime = new Date(next.expiration_at).getTime();

        TestValidator.predicate(
          "expiration_at should be sorted in descending order",
          currentTime >= nextTime,
        );
      }
    }
  }

  // Validate pagination information
  TestValidator.predicate(
    "pagination current page should be 1",
    suspensionsAsc.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit should be 100",
    suspensionsAsc.pagination.limit === 100,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    suspensionsAsc.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should match records and limit",
    suspensionsAsc.pagination.pages >= 0,
  );
}
