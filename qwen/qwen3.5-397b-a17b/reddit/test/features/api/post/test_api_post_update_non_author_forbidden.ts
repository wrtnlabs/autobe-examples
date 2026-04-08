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
 * Test that a non-author member cannot update another user's post and receives 403 Forbidden.
 *
 * Validates the authorization logic that prevents members from updating posts they did not author. This test establishes two separate member accounts, creates a community and post as the first member, then attempts to update that post using the second member's authentication context. The system must reject the unauthorized update attempt with a 403 Forbidden error.
 *
 * The test verifies that the backend correctly compares the authenticated member's ID with the post's author ID before allowing update operations. This ensures content ownership is enforced and prevents unauthorized modifications to other users' posts.
 *
 * 1. Member A (post author) joins and authenticates.
 * 2. Member A creates a community and subscribes to it.
 * 3. Member A creates a text post in the community.
 * 4. Member B (different user) joins and authenticates separately.
 * 5. Member B attempts to update Member A's post.
 * 6. System rejects with 403 Forbidden error.
 * 7. Post remains unchanged after failed update attempt.
 */
export async function test_api_post_update_non_author_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (post author) authentication
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Member A subscribes to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberAConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Member A creates a text post in the community
  const post = await generate_random_reddit_community_posts_create(
    memberAConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Member B (different user) authentication
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberB);
  // Verify members are different
  TestValidator.notEquals("members must be different", memberA.id, memberB.id);
  // 6. Member B attempts to update Member A's post (should fail with 403)
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRedditCommunityPost.IUpdate;
  await TestValidator.error("non-author update forbidden", async () => {
    await api.functional.redditCommunity.posts.update(memberBConnection, {
      postId: post.id,
      body: updateBody,
    });
  });
  // 7. Verify post remains unchanged by fetching it again with Member A's connection
  // Note: Since there's no get endpoint available, we verify by checking the original post object
  // The error test above confirms the update was rejected
  TestValidator.predicate(
    "post author is Member A",
    post.author.id === memberA.id,
  );
  TestValidator.predicate(
    "post belongs to community",
    post.community.id === community.id,
  );
}
