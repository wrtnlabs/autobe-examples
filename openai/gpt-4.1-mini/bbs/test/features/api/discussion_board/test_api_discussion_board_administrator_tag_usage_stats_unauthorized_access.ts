import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test unauthorized access to tag usage statistics retrieval.
 *
 * This test attempts to get a tag usage statistics record without any authentication token.
 * It expects to fail with an authorization error (typically HTTP 401 Unauthorized).
 */
export async function test_api_discussion_board_administrator_tag_usage_stats_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join prerequisite (to fulfill dependency, though not used in main call)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd123456",
    },
  });
  // 2. Attempt to call the tag usage stats endpoint without authentication
  // Use the base connection without any authorization header
  const fakeUsageStatId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized access to tag usage statistics",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.tag_usage_stats.at(
        connection,
        { usageStatId: fakeUsageStatId },
      );
    },
  );
}
