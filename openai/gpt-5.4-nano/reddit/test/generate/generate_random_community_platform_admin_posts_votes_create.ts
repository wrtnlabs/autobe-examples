import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post } from "../prepare/prepare_random_community_platform_post";

export async function generate_random_community_platform_admin_posts_votes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPost.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<void> {
  const prepared: ICommunityPlatformPost.ICreate =
    prepare_random_community_platform_post(props.body);
  return await api.functional.communityPlatform.admin.posts.votes.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
    },
  );
}
