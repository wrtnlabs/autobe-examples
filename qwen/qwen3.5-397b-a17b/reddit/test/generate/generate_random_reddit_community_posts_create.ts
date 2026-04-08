import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_community_post } from "../prepare/prepare_random_reddit_community_post";

/**
 * Generate a random Reddit community post via the API for E2E testing.
 *
 * Prepares random post data using the prepare function, then calls the creation endpoint to create an actual post resource. The post type (text, link, or image) is randomly selected, and the corresponding content field is populated accordingly.
 *
 * The created post includes metadata such as author information, community assignment, vote score, comment count, and timestamps. All fields are auto-generated unless explicitly overridden through the props.body parameter.
 *
 * @param connection - API connection information for the test server
 * @param props - Optional configuration for test customization
 * @param props.body - Optional partial post creation data to override auto-generated values
 * @returns The created IRedditCommunityPost entity with all metadata
 */
export async function generate_random_reddit_community_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCommunityPost.ICreate> | undefined;
  },
): Promise<IRedditCommunityPost> {
  const prepared: IRedditCommunityPost.ICreate =
    prepare_random_reddit_community_post(props.body);
  const result: IRedditCommunityPost =
    await api.functional.redditCommunity.posts.create(connection, {
      body: prepared,
    });
  return result;
}
