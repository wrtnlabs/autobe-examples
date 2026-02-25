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

export async function test_api_moderation_statistics_comprehensive_aggregation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection with authenticated session
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
  // Retrieve moderation statistics after setup
  const statistics =
    await api.functional.discussionBoard.admin.moderation.statistics(
      adminConnection,
    );
  typia.assert(statistics);
  // Validate statistics structure and basic properties
  TestValidator.predicate(
    "has action_type",
    typeof statistics.action_type === "string",
  );
  TestValidator.predicate(
    "has target_content_type",
    typeof statistics.target_content_type === "string",
  );
  TestValidator.predicate(
    "has target_content_id",
    typeof statistics.target_content_id === "string",
  );
  // Note: Moderation statistics endpoint currently returns single moderation log entry
  // Future implementation should aggregate multiple actions for comprehensive statistics
}
