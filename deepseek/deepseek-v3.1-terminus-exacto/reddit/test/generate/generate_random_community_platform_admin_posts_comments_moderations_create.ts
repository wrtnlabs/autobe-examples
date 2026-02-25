import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_moderation } from "../prepare/prepare_random_community_platform_comment_moderation";

export async function generate_random_community_platform_admin_posts_comments_moderations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentModeration.ICreate>;
    params: {
      postId: string;
      commentId: string;
    };
  },
): Promise<ICommunityPlatformCommentModeration> {
  const prepared: ICommunityPlatformCommentModeration.ICreate =
    prepare_random_community_platform_comment_moderation(props.body);
  const result: ICommunityPlatformCommentModeration =
    await api.functional.communityPlatform.admin.posts.comments.moderations.create(
      connection,
      {
        postId: props.params.postId,
        commentId: props.params.commentId,
        body: prepared,
      },
    );
  return result;
}
