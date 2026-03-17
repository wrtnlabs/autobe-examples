import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunitySystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_system_setting } from "../prepare/prepare_random_reddit_community_system_setting";

export async function generate_random_reddit_community_system_settings_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunitySystemSetting.ICreate>;
  },
): Promise<IRedditCommunitySystemSetting> {
  const prepared: IRedditCommunitySystemSetting.ICreate =
    prepare_random_reddit_community_system_setting(props.body);
  const result: IRedditCommunitySystemSetting =
    await api.functional.redditCommunity.system_settings.create(connection, {
      body: prepared,
    });
  return result;
}
