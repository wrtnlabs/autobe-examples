import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_ban } from "../prepare/prepare_random_community_ban";

export async function generate_random_community_member_communities_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBan.ICreate>;
    params: {
      communityName: string;
    };
  },
): Promise<ICommunityBan> {
  const prepared: ICommunityBan.ICreate = prepare_random_community_ban(
    props.body,
  );
  const result: ICommunityBan =
    await api.functional.community.member.communities.bans.create(connection, {
      communityName: props.params.communityName,
      body: prepared,
    });
  return result;
}
