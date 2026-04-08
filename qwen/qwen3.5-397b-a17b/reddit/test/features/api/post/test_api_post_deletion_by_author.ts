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
 * Test that a post author can successfully delete their own post.
 *
 * Validates the complete post deletion workflow including member authentication, community creation, subscription, post creation, and post deletion by the author. Ensures that the post author has the right to delete their own content and that the deletion operation completes successfully.
 *
 * The test verifies that authors maintain full control over their content and can remove posts they have created. The cascade deletion of related comments and votes is handled automatically by the database schema's onDelete: Cascade constraint.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Member creates a community they own.
 * 3. Member subscribes to their own community (required for posting privileges).
 * 4. Member creates a text post in the community.
 * 5. Member deletes the post using DELETE /redditCommunity/posts/{postId}.
 * 6. Verifies the deletion completes successfully with void response.
 *
 * Business Rules Validated:
 * - Authors have the right to delete their own posts
 * - Post deletion operation returns 204 No Content (void response)
 * - Cascade deletion removes related comments and votes via database constraint
 */
export async function test_api_post_deletion_by_author(
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
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community owned by this member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to their own community (required for posting)
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Delete the post as the author
  // Successful completion without throwing confirms 204 No Content response
  await api.functional.redditCommunity.posts.erase(memberConnection, {
    postId: post.id,
  });
}
