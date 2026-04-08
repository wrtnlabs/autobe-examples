import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test that a member can successfully create a link post in a community they are subscribed to.
 *
 * Validates the complete link post creation flow including member registration,
 * community subscription, and post creation with link content. Ensures that the post correctly
 * references the community and that computed fields like vote_score and comment_count are
 * initialized to 0. Special attention is given to verifying that link_url is properly stored
 * and that text_content is null for link posts.
 *
 * 1. Member registers with randomized email and credentials.
 * 2. Member subscribes to an existing community.
 * 3. Member creates a link post with title and valid URL.
 * 4. Validates post details match input and community data.
 */
export async function test_api_member_post_link_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(),
      href: "https://example.com/register",
      referrer: "https://example.com/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Subscribe member to a community (assume community exists in test environment)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 3. Create link post with proper type for link_url
  const linkUrl = typia.random<
    string & tags.Format<"uri"> & tags.MaxLength<80000>
  >();
  const postTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: postTitle,
        post_type: "link" as const,
        reddit_community_community_id: communityId,
        link_url: linkUrl,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Validate post creation
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.equals("link_url matches input", post.link_url, linkUrl);
  TestValidator.equals("post_type is link", post.post_type, "link");
  TestValidator.equals(
    "community matches subscription",
    post.community.id,
    communityId,
  );
  TestValidator.equals("vote_score initialized to 0", post.vote_score, 0);
  TestValidator.equals("comment_count initialized to 0", post.comment_count, 0);
  TestValidator.equals("author matches member", post.author.id, member.id);
  // Validate timestamps are recent (within 1 minute of current time)
  const now = Date.now();
  const createdTime = new Date(post.created_at).getTime();
  const updatedTime = new Date(post.updated_at).getTime();
  TestValidator.predicate(
    "created_at is recent (within 1 minute)",
    Math.abs(now - createdTime) < 60000,
  );
  TestValidator.predicate(
    "updated_at is recent (within 1 minute)",
    Math.abs(now - updatedTime) < 60000,
  );
  TestValidator.equals(
    "created_at equals updated_at for new post",
    post.created_at,
    post.updated_at,
  );
}
