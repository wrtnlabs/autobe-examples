import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_moderator } from "../prepare/prepare_random_community_moderator";

export async function generate_random_community_member_communities_moderators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityModerator.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityModerator> {
  const prepared: ICommunityModerator.ICreate =
    prepare_random_community_moderator(props.body);
  return await api.functional.community.member.communities.moderators.create(
    connection,
    {
      communityId: props.params.communityId,
      body: prepared,
    },
  );
}
