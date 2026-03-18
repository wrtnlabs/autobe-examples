import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_link } from "../prepare/prepare_random_community_platform_post_link";

export async function generate_random_community_platform_member_posts_link_update_post_link(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostLink.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPost> {
  const prepared: ICommunityPlatformPostLink.ICreate =
    prepare_random_community_platform_post_link(props.body);
  return await api.functional.communityPlatform.member.posts.link.updatePostLink(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
