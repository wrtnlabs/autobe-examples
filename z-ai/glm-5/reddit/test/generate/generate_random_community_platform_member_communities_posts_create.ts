import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post } from "../prepare/prepare_random_community_platform_post";

export async function generate_random_community_platform_member_communities_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPost.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformPost> {
  const prepared: ICommunityPlatformPost.ICreate =
    prepare_random_community_platform_post(props.body);
  const result: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.communities.posts.create(
      connection,
      {
        body: prepared,
        communityId: props.params.communityId,
      },
    );
  return result;
}
