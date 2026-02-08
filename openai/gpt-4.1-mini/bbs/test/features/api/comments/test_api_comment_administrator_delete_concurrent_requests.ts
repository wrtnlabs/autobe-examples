import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_comment_administrator_delete_concurrent_requests(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Verify concurrency behavior where two administrators attempt to delete the same comment simultaneously. One should succeed with 204 No Content, the other should receive a 404 Not Found as the comment is already deleted. Validate transactional consistency and audit log entries.
  // 1. Create two administrator accounts and authenticate them
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_administrator_join(admin1Connection, {
    body: {},
  });
  admin1Connection.headers = {
    Authorization: `Bearer ${admin1Auth.token.access}`,
  };
  const admin2Auth = await authorize_administrator_join(admin2Connection, {
    body: {},
  });
  admin2Connection.headers = {
    Authorization: `Bearer ${admin2Auth.token.access}`,
  };
  // 2. Setup: Since comment creation endpoint was not provided, we generate a random UUID as commentId
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Simulate two concurrent delete requests from two different administrators
  const results = await Promise.allSettled([
    api.functional.discussionBoard.administrator.comments.erase(
      admin1Connection,
      { commentId },
    ),
    api.functional.discussionBoard.administrator.comments.erase(
      admin2Connection,
      { commentId },
    ),
  ]);
  // 4. Validate that exactly one succeeds (no error), one fails with 404
  const fulfilledCount = results.filter((r) => r.status === "fulfilled").length;
  const rejectedCount = results.filter((r) => r.status === "rejected").length;
  TestValidator.equals("one deletion succeeded", fulfilledCount, 1);
  TestValidator.equals("one deletion rejected", rejectedCount, 1);
  // Validate error is 404 for the rejected one
  for (const result of results) {
    if (result.status === "rejected") {
      const err = result.reason;
      TestValidator.predicate(
        "error is HttpError",
        err instanceof api.HttpError,
      );
      if (err instanceof api.HttpError) {
        TestValidator.equals("error status is 404", err.status, 404);
      }
    }
  }
}
