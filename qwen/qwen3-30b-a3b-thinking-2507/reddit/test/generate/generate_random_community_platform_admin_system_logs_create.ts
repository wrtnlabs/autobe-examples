import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformSystemLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_system_log } from "../prepare/prepare_random_community_platform_system_log";

export async function generate_random_community_platform_admin_system_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSystemLog.ICreate>;
  },
): Promise<ICommunityPlatformSystemLog> {
  const prepared: ICommunityPlatformSystemLog.ICreate =
    prepare_random_community_platform_system_log(props.body);
  return await api.functional.communityPlatform.admin.system.logs.create(
    connection,
    {
      body: prepared,
    },
  );
}
