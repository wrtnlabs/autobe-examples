import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_post } from "../prepare/prepare_random_community_post";

export async function generate_random_community_member_communities_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPost.ICreate>;
    params: {
      communityName: string;
    };
  },
): Promise<ICommunityPost> {
  const prepared: ICommunityPost.ICreate = prepare_random_community_post(
    props.body,
  );
  const result: ICommunityPost =
    await api.functional.community.member.communities.posts.create(connection, {
      communityName: props.params.communityName,
      body: prepared,
    });
  return result;
}
