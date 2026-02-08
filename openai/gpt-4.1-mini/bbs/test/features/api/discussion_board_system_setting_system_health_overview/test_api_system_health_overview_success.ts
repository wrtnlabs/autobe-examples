import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemSettingSystemHealthOverview } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSettingSystemHealthOverview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_health_overview_success(
  connection: api.IConnection,
): Promise<void> {
  // Since there is no authentication required, we use the base connection directly.
  // Call the API to get system health overview
  const output: IDiscussionBoardSystemSettingSystemHealthOverview =
    await api.functional.discussionBoard.system.health_overview.at(connection);
  // Check the structure of the output matches the DTO structure exactly
  typia.assert(output);
}
