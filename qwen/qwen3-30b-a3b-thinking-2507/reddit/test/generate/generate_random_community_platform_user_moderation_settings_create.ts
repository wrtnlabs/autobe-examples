import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderation_setting } from "../prepare/prepare_random_community_platform_moderation_setting";

export async function generate_random_community_platform_user_moderation_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationSetting.ICreate>;
  },
): Promise<ICommunityPlatformModerationSetting> {
  const prepared = prepare_random_community_platform_moderation_setting(
    props.body,
  );
  const result =
    await api.functional.communityPlatform.user.moderation_settings.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
