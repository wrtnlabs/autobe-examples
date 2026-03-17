import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditClonePostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostText";
import type { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_communities_create } from "../../../generate/generate_random_reddit_clone_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";
import { prepare_random_reddit_clone_post_image } from "../../../prepare/prepare_random_reddit_clone_post_image";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";
import { prepare_random_reddit_clone_post_text } from "../../../prepare/prepare_random_reddit_clone_post_text";
import { prepare_random_reddit_clone_subscription } from "../../../prepare/prepare_random_reddit_clone_subscription";

/**
 * Test retrieving a post by its unique identifier.
 *
 * Workflow:
 * 1. Member joins and authenticates
 * 2. Member creates a community
 * 3. Member subscribes to the community
 * 4. Member creates a TEXT type post with title and body content
 * 5. Retrieve the post using its ID
 * 6. Validate all response fields match expected values
 */
export async function test_api_post_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community = await generate_random_reddit_clone_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon: null,
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create TEXT type post
  const postTitle = RandomGenerator.paragraph({ sentences: 1 });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const createdPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "TEXT",
        community_id: community.id,
        text: {
          body: postBody,
        },
      },
    },
  );
  typia.assert(createdPost);
  // 5. Retrieve post by ID
  const retrievedPost = await api.functional.redditClone.posts.at(
    memberConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(retrievedPost);
  // 6. Validate response fields
  TestValidator.equals("post title matches", retrievedPost.title, postTitle);
  TestValidator.equals("post body matches", retrievedPost.body, postBody);
  TestValidator.equals("post type is TEXT", retrievedPost.post_type, "TEXT");
  TestValidator.equals("vote score is 0", retrievedPost.vote_score, 0);
  TestValidator.equals("comment count is 0", retrievedPost.comment_count, 0);
  TestValidator.equals("url is null for TEXT post", retrievedPost.url, null);
  TestValidator.equals(
    "file_uri is null for TEXT post",
    retrievedPost.file_uri,
    null,
  );
  // Validate author information
  TestValidator.equals(
    "author username matches",
    retrievedPost.author.username,
    memberAuth.username,
  );
  TestValidator.equals(
    "author display_name matches",
    retrievedPost.author.display_name,
    memberAuth.display_name,
  );
  TestValidator.equals(
    "author id matches",
    retrievedPost.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author karma_score matches",
    retrievedPost.author.karma_score,
    memberAuth.karma_score.score,
  );
  // Validate community information
  TestValidator.equals(
    "community name matches",
    retrievedPost.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    retrievedPost.community.description,
    community.description,
  );
  TestValidator.equals(
    "community id matches",
    retrievedPost.community.id,
    community.id,
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at is valid date-time",
    () => new Date(retrievedPost.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => new Date(retrievedPost.updated_at).getTime() > 0,
  );
}
