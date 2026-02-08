import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_activity_logs_create } from "../../../generate/generate_random_community_platform_activity_logs_create";
import { prepare_random_community_platform_activity_log } from "../../../prepare/prepare_random_community_platform_activity_log";

export async function test_api_activity_log_create_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create a user-specific connection from the base
  const userConnection: api.IConnection = { host: connection.host };
  // Generate a random ICreate body using typia
  const input = typia.random<ICommunityPlatformActivityLog.ICreate>();
  // Create an activity log entry using the utility function
  const created = await generate_random_community_platform_activity_logs_create(
    userConnection,
    { body: input },
  );
  // Assert the created object matches ICommunityPlatformActivityLog type
  typia.assert(created);
  // Confirm created is not strictly equal to the input (server generated fields differ)
  TestValidator.notEquals(
    "created is not strictly equal to input",
    created,
    input,
  );
}
