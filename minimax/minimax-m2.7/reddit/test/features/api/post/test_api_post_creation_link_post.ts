import { RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";

/**
 * Test creating a link post.
 *
 * Steps:
 * 1. Register a new member via POST /redditClone/auth/member/join
 * 2. Create a community via POST /redditClone/member/communities
 * 3. Subscribe to the community via POST /redditClone/member/subscriptions
 * 4. Create a link post via POST /redditClone/member/posts with type='link'
 *
 * Validations:
 * - Response returns valid post structure
 * - Post type equals 'link'
 * - vote_score equals 0
 * - comment_count equals 0
 */
export async function test_api_post_creation_link_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});

  // 2. Create a community
  const community = await generate_random_reddit_clone_member_communities_create(
    memberConnection,
    {},
  );

  // 3. Subscribe to the community
  await generate_random_reddit_clone_member_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      },
    },
  );

  // 4. Create a link post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        communityName: community.name,
        type: "link" as const,
      },
    },
  );

  // Validate response
  typia.assert(post);

  // Validate post type is 'link'
  TestValidator.equals("post type", post.type, "link");

  // Validate vote_score is 0
  TestValidator.equals("vote score", post.vote_score, 0);

  // Validate comment_count is 0
  TestValidator.equals("comment count", post.comment_count, 0);
}