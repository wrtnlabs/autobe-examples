import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test creating a link post with an external URL.
 *
 * Validates the complete link post creation workflow including member registration, community setup, subscription, and post creation. Ensures that link posts correctly store the external URL and initialize computed metrics.
 *
 * This test verifies the link post content type workflow where members can share external content by providing a URL instead of text content or image uploads.
 *
 * 1. Register a new member account with unique email, username, and password.
 * 2. Create a new community with unique name and description.
 * 3. Subscribe the member to the created community.
 * 4. Create a link post with title and external URL.
 * 5. Validates the post has content_type='link' and valid content_url.
 * 6. Validates computed metrics are initialized (vote_score=0, comments_count=0).
 * 7. Validates post references the correct community and author.
 */
export async function test_api_post_creation_link_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Create community
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test-community-${RandomGenerator.alphabets(6)}`,
          description: `Test community for link post validation`,
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription: IRedditLikeCommunitySubscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create link post
  const externalUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        community_id: community.id,
        title: `Link post test: ${RandomGenerator.name(3)}`,
        content_type: "link",
        content_url: externalUrl,
      },
    });
  typia.assert(post);
  // 5. Validate link post properties
  TestValidator.equals("content type is link", post.content_type, "link");
  TestValidator.equals("content URL matches", post.content_url, externalUrl);
  // 6. Validate computed metrics
  TestValidator.equals("vote score initialized", post.vote_score, 0);
  TestValidator.equals("comments count initialized", post.comments_count, 0);
  // 7. Validate community and author references
  TestValidator.equals("community ID matches", post.community.id, community.id);
  TestValidator.equals("author ID matches", post.author.id, member.id);
}
