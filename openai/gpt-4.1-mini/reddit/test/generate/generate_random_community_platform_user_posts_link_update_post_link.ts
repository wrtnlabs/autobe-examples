import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_link } from "../prepare/prepare_random_community_platform_post_link";

export async function generate_random_community_platform_user_posts_link_update_post_link(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostLink.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostLink> {
  const prepared: ICommunityPlatformPostLink.ICreate =
    prepare_random_community_platform_post_link(props.body);
  const result: ICommunityPlatformPostLink =
    await api.functional.communityPlatform.user.posts.link.updatePostLink(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
