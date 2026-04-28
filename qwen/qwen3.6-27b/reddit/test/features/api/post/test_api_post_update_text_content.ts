import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test updating text content of a post authored by the authenticated member.
 *
 * Validates that a member can modify the title and body text of their own text-type post. Confirms that mutable fields (title, body, updated_at) reflect the new values while immutable fields (id, author, community, post_type, created_at) remain unchanged after the update operation.
 *
 * Special attention is given to verifying field immutability - the post identity, authorship, community affiliation, content type, and creation timestamp must be preserved. The updated_at timestamp confirms the server correctly timestamps the modification.
 *
 * 1. Member authenticates by joining with email, password, username, and session context.
 * 2. Member creates a community with a name and description.
 * 3. Member subscribes to the community.
 * 4. Member creates a text-type post with initial title and body content.
 * 5. Member updates the post with a new title and new body content.
 * 6. Validates response structure matches IREdditLikeCommunityPost type.
 * 7. Validates updated fields (title, body) match the new values provided.
 * 8. Validates immutable fields (id, author, community, post_type, created_at) remain unchanged.
 * 9. Validates updated_at timestamp is different from the original creation time.
 */
export async function test_api_post_update_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      username: RandomGenerator.name(),
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create a community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a text-type post
  const originalPost =
    await generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(originalPost);
  // 5. Update the post with new title and body content
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IREdditLikeCommunityPost.IUpdate;
  const updatedPost =
    await api.functional.redditLikeCommunity.member.posts.update(
      memberConnection,
      {
        postId: originalPost.id,
        body: updateBody,
      },
    );
  typia.assert(updatedPost);
  // 6-9. Validate business logic
  TestValidator.equals("title updated", updatedPost.title, updateBody.title);
  TestValidator.equals("body updated", updatedPost.body, updateBody.body);
  TestValidator.equals("post id preserved", updatedPost.id, originalPost.id);
  TestValidator.equals(
    "author preserved",
    updatedPost.author.id,
    originalPost.author.id,
  );
  TestValidator.equals(
    "community preserved",
    updatedPost.community.id,
    originalPost.community.id,
  );
  TestValidator.equals(
    "post_type preserved",
    updatedPost.post_type,
    originalPost.post_type,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedPost.created_at,
    originalPost.created_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedPost.updated_at,
    originalPost.updated_at,
  );
}
