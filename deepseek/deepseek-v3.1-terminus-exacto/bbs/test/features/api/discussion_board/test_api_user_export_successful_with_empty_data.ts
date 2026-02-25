import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBackupRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBackupRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_export_successful_with_empty_data(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate as a new user
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Call the export endpoint
  const exportRecord =
    await api.functional.discussionBoard.user._export.generateExport(
      userConnection,
    );
  typia.assert(exportRecord);
  // Validate business logic - export operation completed successfully
  TestValidator.predicate(
    "export operation has valid status",
    exportRecord.status === "completed" || exportRecord.status === "processing",
  );
  // Verify export record has proper timestamps
  TestValidator.predicate(
    "export has start timestamp",
    new Date(exportRecord.started_at).getTime() > 0,
  );
  // For completed exports, verify completion timestamp
  if (exportRecord.status === "completed") {
    TestValidator.predicate(
      "completed export has completion timestamp",
      exportRecord.completed_at !== null &&
        exportRecord.completed_at !== undefined,
    );
    TestValidator.predicate(
      "completion timestamp is after start timestamp",
      new Date(exportRecord.completed_at!).getTime() >
        new Date(exportRecord.started_at).getTime(),
    );
  }
}
