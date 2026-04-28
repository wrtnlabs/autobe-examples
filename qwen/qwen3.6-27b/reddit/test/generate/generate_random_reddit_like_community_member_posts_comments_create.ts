import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IRedditLikeCommunityPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_post_comment } from "../prepare/prepare_random_reddit_like_community_post_comment";

/**
 * Generate a random reddit-like community post comment for E2E testing.
 *
 * Prepares comment data using the prepare function, then creates the comment on the post specified
 * by postId via the API. The comment supports optional parent comment ID for nested threading.
 */
export async function generate_random_reddit_like_community_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityPostComment.ICreate>;
    params?: {
      postId: string;
    };
  },
): Promise<IRedditLikeCommunityPostComment> {
  const prepared: IRedditLikeCommunityPostComment.ICreate =
    prepare_random_reddit_like_community_post_comment(props.body);
  const result: IRedditLikeCommunityPostComment =
    await api.functional.redditLikeCommunity.member.posts.comments.create(
      connection,
      {
        postId: props.params!.postId,
        body: prepared,
      },
    );
  return result;
}