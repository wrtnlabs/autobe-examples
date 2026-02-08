import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_comment } from "../prepare/prepare_random_community_platform_post_comment";

export async function generate_random_community_platform_user_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostComment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostComment> {
  const prepared: ICommunityPlatformPostComment.ICreate =
    prepare_random_community_platform_post_comment(props.body);
  const result: ICommunityPlatformPostComment =
    await api.functional.communityPlatform.user.posts.comments.create(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
