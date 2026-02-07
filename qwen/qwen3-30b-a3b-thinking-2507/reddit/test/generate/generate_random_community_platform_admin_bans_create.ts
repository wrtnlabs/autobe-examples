import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_moderation_ban } from "../prepare/prepare_random_community_platform_moderation_ban";

export async function generate_random_community_platform_admin_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformModerationBan.ICreate>;
  },
): Promise<ICommunityPlatformModerationBan> {
  const prepared: ICommunityPlatformModerationBan.ICreate =
    prepare_random_community_platform_moderation_ban(props.body);
  const result: ICommunityPlatformModerationBan =
    await api.functional.communityPlatform.admin.bans.create(connection, {
      body: prepared,
    });
  return result;
}
