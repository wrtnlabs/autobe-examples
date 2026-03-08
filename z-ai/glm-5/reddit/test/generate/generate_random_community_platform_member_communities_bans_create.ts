import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_ban } from "../prepare/prepare_random_community_platform_community_ban";

export async function generate_random_community_platform_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityBan.ICreate>;
    params: {
      communityName: string;
    };
  },
): Promise<ICommunityPlatformCommunityBan> {
  const prepared: ICommunityPlatformCommunityBan.ICreate =
    prepare_random_community_platform_community_ban(props.body);
  const result: ICommunityPlatformCommunityBan =
    await api.functional.communityPlatform.member.communities.bans.create(
      connection,
      {
        communityName: props.params.communityName,
        body: prepared,
      },
    );
  return result;
}
