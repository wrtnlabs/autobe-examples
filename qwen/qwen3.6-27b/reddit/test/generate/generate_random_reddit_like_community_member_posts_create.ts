import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_like_community_post } from "../prepare/prepare_random_reddit_like_community_post";

/**
 * Generate a random Reddit-like community post via the API for E2E testing.
 *
 * Prepares random post creation data including title, post type (text/link/image),
 * community ID, body content, and URL. The post can be a text post with written
 * content, a link post with an external URL, or an image post. The authenticated
 * member must have an active subscription to the target community before creating
 * the post. The system automatically sets the author to the authenticated user.
 */
export async function generate_random_reddit_like_community_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IREdditLikeCommunityPost.ICreate> | undefined;
  },
): Promise<IREdditLikeCommunityPost> {
  const prepared: IREdditLikeCommunityPost.ICreate =
    prepare_random_reddit_like_community_post(props.body);
  const result: IREdditLikeCommunityPost =
    await api.functional.redditLikeCommunity.member.posts.create(connection, {
      body: prepared,
    });
  return result;
}
