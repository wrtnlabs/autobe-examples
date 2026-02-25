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

export async function test_api_admin_content_moderation_log_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator using connection isolation pattern
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Retrieve content moderation log with random UUID
  // Note: This tests the retrieval functionality. If the ID doesn't exist,
  // the API should handle it appropriately (404 response or empty response)
  const moderationLogId = typia.random<string & tags.Format<"uuid">>();
  const log =
    await api.functional.discussionBoard.admin.content_moderation_logs.at(
      adminConnection,
      { moderationLogId },
    );
  // Step 3: Validate response structure using typia.assert for complete validation
  typia.assert(log);
  // Validate business logic: the retrieved log should match the requested ID
  TestValidator.equals(
    "moderation log ID matches requested ID",
    log.id,
    moderationLogId,
  );
}
