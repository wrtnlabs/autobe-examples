import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_community } from "../prepare/prepare_random_community_community";

export async function generate_random_community_member_communities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityCommunity.ICreate>;
  },
): Promise<ICommunityCommunity> {
  const prepared: ICommunityCommunity.ICreate =
    prepare_random_community_community(props.body);
  const result: ICommunityCommunity =
    await api.functional.community.member.communities.create(connection, {
      body: prepared,
    });
  return result;
}
