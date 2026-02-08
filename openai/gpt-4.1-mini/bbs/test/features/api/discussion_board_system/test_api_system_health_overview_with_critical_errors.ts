import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemSettingSystemHealthOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSettingSystemHealthOverview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_health_overview_with_critical_errors(
  connection: api.IConnection,
): Promise<void> {
  // Since no utility function is available for this GET endpoint, use the SDK function
  const healthOverview =
    await api.functional.discussionBoard.system.health_overview.at({
      host: connection.host,
    });
  // Validate the response structure
  typia.assert(healthOverview);
  // Additional validations can be based ONLY on available properties in the schema (empty object in this case means no required properties), so we assert typia.assert only.
}
