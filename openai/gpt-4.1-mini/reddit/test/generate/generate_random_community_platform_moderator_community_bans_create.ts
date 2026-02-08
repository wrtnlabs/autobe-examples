import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_ban } from "../prepare/prepare_random_community_platform_community_ban";

export async function generate_random_community_platform_moderator_community_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityBan.ICreate> | undefined;
  },
): Promise<ICommunityPlatformCommunityBan> {
  const prepared: ICommunityPlatformCommunityBan.ICreate =
    prepare_random_community_platform_community_ban(props.body);
  const result: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.moderator.community_bans.create(
      connection,
      { body: prepared },
    );
  return result;
}
