import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderation_log } from "../prepare/prepare_random_community_platform_moderation_log";

export async function generate_random_community_platform_moderator_moderation_logs_create_moderation_log(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationLog.ICreate> | undefined;
  },
): Promise<ICommunityPlatformModerationLog> {
  const prepared: ICommunityPlatformModerationLog.ICreate =
    prepare_random_community_platform_moderation_log(props.body);
  return await api.functional.communityPlatform.moderator.moderation_logs.createModerationLog(
    connection,
    {
      body: prepared,
    },
  );
}
