import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFlag";
import { prepare_random_community_platform_flag } from "../prepare/prepare_random_community_platform_flag";
export async function generate_random_community_platform_admin_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFlag.ICreate>;
  },
): Promise<ICommunityPlatformFlag> {
  const prepared: ICommunityPlatformFlag.ICreate =
    prepare_random_community_platform_flag(props.body);
  const result: ICommunityPlatformFlag =
    await api.functional.communityPlatform.admin.flags.create(connection, {
      body: prepared,
    });
  return result;
}
