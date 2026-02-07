import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the retrieval of ban appeals for a specific ban record.
 * This test validates the paginated response structure and authentication
 * requirements for accessing ban appeal history, handling cases where
 * no ban appeals exist for the given record.
 */
export async function test_api_user_ban_appeals_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Generate a random UUID for banRecordId (likely non-existent)
  const banRecordId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve ban appeals for the specified ban record
  const appealsPage =
    await api.functional.discussionBoard.user.ban_records.appeals.index(
      userConnection,
      { banRecordId },
    );
  typia.assert(appealsPage);
  // Validate pagination structure exists
  TestValidator.equals(
    "pagination structure exists",
    typeof appealsPage.pagination,
    "object",
  );
  // Validate pagination properties with proper type checking
  TestValidator.predicate(
    "current page is non-negative integer",
    appealsPage.pagination.current >= 0 &&
      Number.isInteger(appealsPage.pagination.current),
  );
  TestValidator.predicate(
    "limit is non-negative integer",
    appealsPage.pagination.limit >= 0 &&
      Number.isInteger(appealsPage.pagination.limit),
  );
  TestValidator.predicate(
    "records count is non-negative integer",
    appealsPage.pagination.records >= 0 &&
      Number.isInteger(appealsPage.pagination.records),
  );
  TestValidator.predicate(
    "pages count is non-negative integer",
    appealsPage.pagination.pages >= 0 &&
      Number.isInteger(appealsPage.pagination.pages),
  );
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(appealsPage.data), true);
  // Validate pagination calculations for empty or non-empty results
  if (appealsPage.pagination.records === 0) {
    TestValidator.equals(
      "pages is 0 when records is 0",
      appealsPage.pagination.pages,
      0,
    );
    TestValidator.equals(
      "data array is empty when records is 0",
      appealsPage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "pages calculation correct",
      appealsPage.pagination.pages ===
        Math.ceil(
          appealsPage.pagination.records / appealsPage.pagination.limit,
        ),
    );
    // If there are appeals, validate their structure
    if (appealsPage.data.length > 0) {
      const appeal = appealsPage.data[0];
      typia.assert(appeal);
      // Basic type validation for appeal properties
      TestValidator.equals("appeal id is string", typeof appeal.id, "string");
      TestValidator.equals(
        "appeal reason is string",
        typeof appeal.appeal_reason,
        "string",
      );
      TestValidator.equals(
        "appeal status is string",
        typeof appeal.status,
        "string",
      );
      TestValidator.equals(
        "appealed_at is string",
        typeof appeal.appealed_at,
        "string",
      );
      // reviewed_at can be null or string
      TestValidator.predicate(
        "reviewed_at is null or string",
        appeal.reviewed_at === null || typeof appeal.reviewed_at === "string",
      );
      // Validate user summary structure
      TestValidator.equals("user object exists", typeof appeal.user, "object");
      TestValidator.equals(
        "user id is string",
        typeof appeal.user.id,
        "string",
      );
      TestValidator.equals(
        "user display_name is string",
        typeof appeal.user.display_name,
        "string",
      );
      TestValidator.predicate(
        "user bio is string or null",
        typeof appeal.user.bio === "string" || appeal.user.bio === null,
      );
      TestValidator.equals(
        "user created_at is string",
        typeof appeal.user.created_at,
        "string",
      );
      TestValidator.equals(
        "user updated_at is string",
        typeof appeal.user.updated_at,
        "string",
      );
    }
  }
}
