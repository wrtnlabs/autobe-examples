import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostView } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostView";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_view } from "../prepare/prepare_random_community_platform_post_view";

export async function generate_random_community_platform_posts_view_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostView.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostView> {
  const prepared: ICommunityPlatformPostView.ICreate =
    prepare_random_community_platform_post_view(props.body);
  const result: ICommunityPlatformPostView =
    await api.functional.communityPlatform.posts.view.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
