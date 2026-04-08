import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_reddit_clone_post } from "../prepare/prepare_random_reddit_clone_post";

/**
 * Generate a random Reddit clone post via the API for E2E testing.
 *
 * Prepares random post data using the prepare function, then calls the creation
 * endpoint. Supports three post types: text posts with body content, link posts
 * with external URLs, and image posts with image URLs. The prepare function
 * automatically populates the appropriate content field based on the selected
 * post type.
 *
 * This function requires an authenticated user who is subscribed to the target
 * community. The post becomes immediately visible in the community feed and the
 * user's post history upon creation.
 */
export async function generate_random_reddit_clone_member_posts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditClonePost.ICreate> | undefined;
  },
): Promise<IRedditClonePost> {
  const prepared: IRedditClonePost.ICreate = prepare_random_reddit_clone_post(
    props.body,
  );
  const result: IRedditClonePost =
    await api.functional.redditClone.member.posts.create(connection, {
      body: prepared,
    });
  return result;
}
