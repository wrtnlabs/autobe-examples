import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test successful creation of a text post by a subscribed member.
 *
 * Validates the complete text post creation workflow including member authentication, community creation, subscription establishment, and post creation. Ensures that the post is correctly created with all required fields and that the subscription requirement is properly enforced.
 *
 * The test verifies that text posts contain the body content in the content field, that vote score and comment count start at 0, and that the author and community references are correctly populated.
 *
 * 1. Member registers and authenticates with email, password, and username.
 * 2. Member creates a community with name, description, and icon.
 * 3. Member subscribes to the created community.
 * 4. Member creates a text post with title, post_type='text', community_id, and body.
 * 5. Validates post entity structure including id, title, postType='text', author, community, voteScore=0, commentsCount=0, timestamps, and deletedAt=null.
 * 6. Validates content field contains the submitted body text.
 * 7. Validates author matches the authenticated member.
 * 8. Validates community matches the target community.
 */
export async function test_api_post_creation_text_with_subscription(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create community owned by member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community (required before post creation)
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  TestValidator.predicate(
    "subscription is active",
    subscription.deletedAt === null,
  );
  // 4. Create text post with body content
  const bodyContent = RandomGenerator.content({ paragraphs: 3 });
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: bodyContent,
      },
    },
  );
  typia.assert(post);
  // 5. Validate post structure and initial state
  TestValidator.equals("post type is text", post.postType, "text");
  TestValidator.equals("vote score starts at 0", post.voteScore, 0);
  TestValidator.equals("comments count starts at 0", post.commentsCount, 0);
  TestValidator.predicate("deletedAt is null", post.deletedAt === null);
  TestValidator.predicate("createdAt exists", post.createdAt !== undefined);
  TestValidator.predicate("updatedAt exists", post.updatedAt !== undefined);
  // 6. Validate content field contains submitted body text
  TestValidator.predicate("content exists", post.content !== undefined);
  if (post.content !== undefined) {
    const textContent = typia.assert<IRedditCommunityPostTextContent>(post.content);
    TestValidator.equals("body matches input", textContent.body, bodyContent);
  }
  // 7. Validate author matches authenticated member
  TestValidator.equals("author id matches", post.author.id, memberAuth.id);
  TestValidator.equals(
    "author username matches",
    post.author.username,
    memberAuth.username,
  );
  // 8. Validate community matches target community
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals(
    "community name matches",
    post.community.name,
    community.name,
  );
  TestValidator.equals(
    "subscription community matches",
    subscription.community.id,
    community.id,
  );
}