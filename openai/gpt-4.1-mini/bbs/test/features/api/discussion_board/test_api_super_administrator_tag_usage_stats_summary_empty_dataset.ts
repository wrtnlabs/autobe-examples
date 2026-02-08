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

export async function test_api_super_administrator_tag_usage_stats_summary_empty_dataset(
  connection: api.IConnection,
): Promise<void> {
  // Test edge case scenario where no tags exist in the system.
  // The super administrator calls the tag usage stats summary endpoint expecting an empty list.
  // The test confirms the system handles empty data sets gracefully without errors and returns an empty array with HTTP 200 status.
  // It verifies no authentication bypass and correct JSON response format matching IDiscussionBoardMvTagUsageStat.ISummary schema.
  // 1. Create super administrator connection and authenticate via join utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  // The body is empty object because IDiscussionBoardSuperAdministrator.IJoin is empty
  const auth = await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  superAdminConnection.headers = {
    Authorization: `Bearer ${auth.token.access}`,
  };
  // 2. Call the tag usage stats summary endpoint with authenticated super administrator connection
  const output =
    await api.functional.discussionBoard.superAdministrator.tags.usage_stats.summary.index(
      superAdminConnection,
    );
  // 3. Assert the output matches the expected type
  typia.assert(output);
  // 4. The output should be an empty object according to IDiscussionBoardMvTagUsageStat.ISummary schema
  // According to instructions: it returns an empty array with HTTP 200 status
  // However, the schema for ISummary is defined as empty object {}, so empty object is expected
  // Check the output is an object
  TestValidator.predicate(
    "output is an object",
    typeof output === "object" && output !== null && !Array.isArray(output),
  );
  // Since schema is empty object, output must be empty object
  TestValidator.equals("output is empty object", output, {});
}
