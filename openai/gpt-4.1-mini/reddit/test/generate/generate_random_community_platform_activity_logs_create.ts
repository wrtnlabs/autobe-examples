import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActivityLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_activity_log } from "../prepare/prepare_random_community_platform_activity_log";

export async function generate_random_community_platform_activity_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformActivityLog.ICreate> | undefined;
  },
): Promise<ICommunityPlatformActivityLog> {
  const prepared: ICommunityPlatformActivityLog.ICreate =
    prepare_random_community_platform_activity_log(props.body);
  const result: ICommunityPlatformActivityLog =
    await api.functional.communityPlatform.activityLogs.create(connection, {
      body: prepared,
    });
  return result;
}
