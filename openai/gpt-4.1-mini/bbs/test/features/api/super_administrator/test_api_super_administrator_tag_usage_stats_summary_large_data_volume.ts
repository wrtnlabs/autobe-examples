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

export async function test_api_super_administrator_tag_usage_stats_summary_large_data_volume(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Since the IDiscussionBoardSuperAdministrator.IJoin type is empty, pass an empty object as body
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    { body: {} },
  );
  superAdminConnection.headers = superAdminConnection.headers ?? {};
  superAdminConnection.headers.Authorization = `Bearer ${authorized.token.access}`;
  // 2. Retrieve tag usage stats summary using the super admin connection
  const output: IDiscussionBoardMvTagUsageStat.ISummary =
    await api.functional.discussionBoard.superAdministrator.tags.usage_stats.summary.index(
      superAdminConnection,
    );
  // 3. Assert output schema conformity
  typia.assert(output);
  // 4. Perform spot validation on output to confirm large volume handling
  // (Since ISummary is {} empty object type, no properties to validate)
  // But per scenario, suppose we want to confirm that it's an object (non-null)
  TestValidator.predicate(
    "output is non-null object",
    typeof output === "object" && output !== null,
  );
}
