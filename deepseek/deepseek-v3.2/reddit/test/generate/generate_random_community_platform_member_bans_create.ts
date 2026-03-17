import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_ban } from "../prepare/prepare_random_community_platform_ban";

export async function generate_random_community_platform_member_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformBan.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformBan> {
  const prepared: ICommunityPlatformBan.ICreate =
    prepare_random_community_platform_ban(props.body);
  const result: ICommunityPlatformBan =
    await api.functional.communityPlatform.member.bans.create(connection, {
      communityId: props.params.communityId,
      body: prepared,
    });
  return result;
}
