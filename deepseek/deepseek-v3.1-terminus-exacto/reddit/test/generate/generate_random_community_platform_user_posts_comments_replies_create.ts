import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment } from "../prepare/prepare_random_community_platform_comment";

export async function generate_random_community_platform_user_posts_comments_replies_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformComment.ICreate> | undefined;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<ICommunityPlatformComment.ISummary> {
  const prepared: ICommunityPlatformComment.ICreate =
    prepare_random_community_platform_comment(props.body);
  return await api.functional.communityPlatform.user.posts.comments.replies.create(
    connection,
    {
      body: prepared,
      postId: props.params.postId,
      commentId: props.params.commentId,
    },
  );
}
