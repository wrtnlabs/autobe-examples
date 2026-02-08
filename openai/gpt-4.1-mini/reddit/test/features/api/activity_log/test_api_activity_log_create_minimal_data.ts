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

export async function test_api_activity_log_create_minimal_data(
  connection: api.IConnection,
): Promise<void> {
  // This test covers creating an activity log with minimal required data.
  // No user IP, user agent, or other optional metadata are provided.
  const userConnection: api.IConnection = { host: connection.host };
  // Call the utility function to create activity log with minimal data (empty object)
  const logEntry =
    await generate_random_community_platform_activity_logs_create(
      userConnection,
      {
        body: {},
      },
    );
  // Validate the returned log entry
  typia.assert(logEntry);
}