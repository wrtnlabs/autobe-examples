import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_post } from "../prepare/prepare_random_reddit_community_post";

/**
 * Generate a random reddit community post via the API for E2E testing.
 *
 * Creates a new post in a community with randomized content including title, post type,
 * and appropriate content fields (text_content for text posts, link_url for link posts,
 * files for image posts). The post is submitted to the /redditCommunity/member/posts
 * endpoint using the prepared test data and returns the complete post object.
 *
 * Usage:
 * ```typescript
 * const post = await generate_random_reddit_community_member_posts_create(connection);
 * ```
 */
export async function generate_random_reddit_community_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityPost.ICreate> | undefined;
  },
): Promise<IRedditCommunityPost> {
  const prepared: IRedditCommunityPost.ICreate =
    prepare_random_reddit_community_post(props.body);
  return await api.functional.redditCommunity.member.posts.create(connection, {
    body: prepared,
  });
}
