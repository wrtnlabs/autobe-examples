import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { prepare_random_community_platform_moderation_log } from "../prepare/prepare_random_community_platform_moderation_log";
export async function generate_random_community_platform_admin_moderation_logs_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationLog.ICreate>;
  },
): Promise<ICommunityPlatformModerationLog> {
  const prepared: ICommunityPlatformModerationLog.ICreate =
    prepare_random_community_platform_moderation_log(props.body);
  const result: ICommunityPlatformModerationLog =
    await api.functional.communityPlatform.admin.moderation.logs.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
