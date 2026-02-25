import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_content_moderation_log_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_admin_join utility function (available in template)
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Generate a valid UUID that doesn't correspond to any existing record
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  // Validate that retrieving a non-existent moderation log returns a 404 error
  await TestValidator.httpError(
    "retrieving non-existent moderation log should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.content_moderation_logs.at(
        adminConnection,
        {
          moderationLogId: nonExistentLogId,
        },
      );
    },
  );
}
