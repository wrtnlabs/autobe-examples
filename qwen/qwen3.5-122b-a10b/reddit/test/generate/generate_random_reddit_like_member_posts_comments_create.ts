import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_comment } from "../prepare/prepare_random_reddit_like_comment";

/**
 * Generate a random comment on a post via the API for E2E testing.
 *
 * Creates a new comment attached to the specified post, optionally as a reply to an existing comment.
 *
 * This function prepares random comment data using the prepare_random_reddit_like_comment function,
 * then calls the creation endpoint to create the actual comment resource. The comment can be a
 * top-level comment on the post or a nested reply to another comment, depending on the parentId
 * field in the prepared data.
 *
 * @param connection - The API connection object containing host and authentication information
 * @param props - Configuration object with optional body and required params
 * @param props.body - Optional partial comment data to override random generation
 * @param props.params - URL parameters containing the postId
 * @param props.params.postId - UUID of the post to comment on (required)
 * @returns The newly created comment with full entity data including generated ID and timestamps
 */
export async function generate_random_reddit_like_member_posts_comments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeComment.ICreate>;
    params: {
      postId: string;
    };
  },
): Promise<IRedditLikeComment> {
  const prepared: IRedditLikeComment.ICreate =
    prepare_random_reddit_like_comment(props.body);
  const result: IRedditLikeComment =
    await api.functional.redditLike.member.posts.comments.create(connection, {
      postId: props.params.postId,
      body: prepared,
    });
  return result;
}
