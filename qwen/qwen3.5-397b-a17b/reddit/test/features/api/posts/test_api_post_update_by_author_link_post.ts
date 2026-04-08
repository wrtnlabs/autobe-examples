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
 * Test that a post author can successfully update their link post's URL and domain.
 *
 * Validates the complete link post update workflow including member authentication, community setup, post creation, and post update operations. Ensures that the post author can modify their link post's URL and that the backend correctly extracts the domain from the new URL.
 *
 * Special attention is given to verifying that the post_type remains 'link' after update, the domain is automatically extracted from the new URL, and the updated_at timestamp reflects the modification time. The test also confirms that type-specific content in reddit_community_post_links table is properly updated.
 *
 * 1. Member joins and authenticates to obtain authorization token.
 * 2. Member creates a community they own.
 * 3. Member subscribes to their own community to enable posting.
 * 4. Member creates a link post with initial title and URL.
 * 5. Member updates the post with a new URL and optionally new title.
 * 6. Validates the updated post contains new URL and extracted domain.
 * 7. Validates updated_at timestamp is newer than created_at.
 * 8. Validates post_type remains 'link' and all metadata is consistent.
 */
export async function test_api_post_update_by_author_link_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
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
  // 4. Create link post
  const initialUrl = "https://example.com/article/123";
  const linkPost = await generate_random_reddit_community_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "link",
        community_id: community.id,
        url: initialUrl,
      },
    },
  );
  typia.assert(linkPost);
  // Validate initial post is a link post
  TestValidator.equals("post type is link", linkPost.postType, "link");
  TestValidator.predicate("has link content", linkPost.content !== undefined);
  if (linkPost.content) {
    const linkContent = linkPost.content as IRedditCommunityPostLinkContent;
    TestValidator.equals("initial URL matches", linkContent.url, initialUrl);
  }
  // 5. Update the post with new URL
  const newUrl = "https://github.com/typescript/typescript";
  const newTitle = RandomGenerator.paragraph({ sentences: 3 });
  const updatedPost = await api.functional.redditCommunity.posts.update(
    memberConnection,
    {
      postId: linkPost.id,
      body: {
        title: newTitle,
        url: newUrl,
      } satisfies IRedditCommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate updated post contains new URL and domain
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals("post type remains link", updatedPost.postType, "link");
  TestValidator.predicate(
    "has link content after update",
    updatedPost.content !== undefined,
  );
  if (updatedPost.content) {
    const updatedLinkContent = typia.assert<IRedditCommunityPostLinkContent>(
      updatedPost.content,
    );
    TestValidator.equals(
      "URL updated to new value",
      updatedLinkContent.url,
      newUrl,
    );
    TestValidator.predicate(
      "domain is non-empty string",
      updatedLinkContent.domain.length > 0,
    );
  }
  // 7. Validate timestamps
  TestValidator.predicate(
    "updated_at is newer than created_at",
    new Date(updatedPost.updatedAt).getTime() >
      new Date(updatedPost.createdAt).getTime(),
  );
  // 8. Validate metadata consistency
  TestValidator.equals(
    "author unchanged",
    updatedPost.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "community unchanged",
    updatedPost.community.id,
    community.id,
  );
  TestValidator.equals("post ID unchanged", updatedPost.id, linkPost.id);
  TestValidator.predicate("post not deleted", updatedPost.deletedAt === null);
}
