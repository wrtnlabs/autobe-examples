import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_post } from "../prepare/prepare_random_reddit_like_post";

/**
 * Generate a random Reddit-like post via the API for E2E testing.
 *
 * Prepares random post data using the prepare function, then calls the creation endpoint to create a post in a community. The post can be a text post, link post, or image post depending on the content_type.
 *
 * ## Content Type Support
 *
 * - Text posts: Include content_text field with body content
 * - Link posts: Include content_url field with external URL
 * - Image posts: No content fields (image uploaded separately via multipart)
 *
 * ## Prerequisites
 *
 * Before calling this function, ensure:
 * - A community has been created
 * - The authenticated member has subscribed to the target community
 * - The community_id in props.body matches an existing subscribed community
 *
 * @param connection The API connection object with authentication
 * @param props.body Optional partial post data to override random values
 * @returns The created post with computed vote_score (0) and comments_count (0)
 */
export async function generate_random_reddit_like_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikePost.ICreate>;
  },
): Promise<IRedditLikePost> {
  const prepared: IRedditLikePost.ICreate = prepare_random_reddit_like_post(
    props.body,
  );
  const result: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: prepared,
    });
  return result;
}
