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

export async function test_api_activity_log_create_varied_metadata(
  connection: api.IConnection,
): Promise<void> {
  const userConnection: api.IConnection = { host: connection.host };
  // Since ICommunityPlatformActivityLog.ICreate is an empty type, we send empty bodies
  // Call the creation multiple times to simulate varied entries
  for (let i = 0; i < 5; ++i) {
    // Create an activity log with empty body
    const log = await generate_random_community_platform_activity_logs_create(
      userConnection,
      {
        body: {},
      },
    );
    typia.assert(log);
    // Check that if the id property exists, it is a non-empty string (UUID format assumed)
    if ((log as any).id !== undefined) {
      TestValidator.predicate(
        "log id is non-empty string",
        typeof (log as any).id === "string" && (log as any).id.length > 0,
      );
    }
    // Check created_at timestamp if it exists
    if ((log as any).created_at !== undefined) {
      TestValidator.predicate(
        "log created_at is string",
        typeof (log as any).created_at === "string",
      );
    }
  }
}
