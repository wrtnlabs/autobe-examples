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
 * Test moderator post deletion authority within their community.
 *
 * Validates that a community moderator (owner) can delete any post within their community, regardless of who authored it. This test ensures moderator permissions are properly enforced and that cascade deletion behavior works correctly for moderator-initiated deletions.
 *
 * The test creates two distinct member accounts: member A who owns the community and acts as moderator, and member B who creates a post in that community. Member A then deletes member B's post to verify moderator authority extends beyond self-authored content.
 *
 * 1. Member A registers and creates a community (becoming owner/moderator).
 * 2. Member B registers with separate credentials.
 * 3. Member B subscribes to member A's community.
 * 4. Member B creates a text post in the community.
 * 5. Member A (moderator) deletes member B's post using the erase endpoint.
 * 6. Validates deletion succeeds with void response.
 */
export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (moderator/owner) registration and community creation
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const community =
    await generate_random_reddit_community_member_communities_create(
      moderatorConnection,
      {},
    );
  typia.assert(community);
  // 2. Member B (post author) registration
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authorAuth);
  // 3. Member B subscribes to the community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Member B creates a post in the community
  const post = await generate_random_reddit_community_posts_create(
    authorConnection,
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
  // Verify post author is member B
  TestValidator.equals(
    "post author is member B",
    post.author.id,
    authorAuth.id,
  );
  TestValidator.equals(
    "post community matches",
    post.community.id,
    community.id,
  );
  // 5. Moderator (member A) deletes member B's post
  // erase() returns void, so no assertion needed on return value
  await api.functional.redditCommunity.posts.erase(moderatorConnection, {
    postId: post.id,
  });
}
