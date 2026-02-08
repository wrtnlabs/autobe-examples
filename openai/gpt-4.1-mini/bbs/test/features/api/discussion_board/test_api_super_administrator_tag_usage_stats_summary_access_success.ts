import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMvTagUsageStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMvTagUsageStat";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_super_administrator_tag_usage_stats_summary_access_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized: IDiscussionBoardSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(superAdminConnection, {
      body: {},
    });
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Call the endpoint to get tag usage stats summary
  const output: IDiscussionBoardMvTagUsageStat.ISummary =
    await api.functional.discussionBoard.superAdministrator.tags.usage_stats.summary.index(
      superAdminConnection,
    );
  // 3. Assert the response structure
  typia.assert(output);
  // 4. Validate that output is not empty and read-only (we check non-null fields if exist)
  TestValidator.predicate(
    "tags usage stats is object",
    typeof output === "object" && output !== null,
  );
  // Cannot test fields existence because ISummary is an empty object type
  // Just ensure typia.assert passed to trust the structure
}
