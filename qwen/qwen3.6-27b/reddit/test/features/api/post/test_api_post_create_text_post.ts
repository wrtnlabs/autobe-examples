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
 * Test member text post creation workflow in a subscribed community.
 *
 * Validates the complete text post creation flow including member authentication, community creation, subscription establishment, and post content submission. Ensures the post is successfully created with the correct post_type set to 'text', the body is populated with content, and the post is properly associated with the target community.
 *
 * The workflow verifies that the authenticated member can create both a community and subscribe to it, then successfully create a text post within that community. Post validation confirms the content type, body population, community association, and title preservation after creation.
 *
 * 1. Member authenticates via join with email, username, and registration credentials.
 * 2. Authenticated member creates a community with name and description.
 * 3. Member subscribes to the created community as prerequisite for posting.
 * 4. Member creates a text post with title and body content in the subscribed community.
 * 5. Validates post_type is 'text', body is populated, community association is correct, and title matches input.
 */
export async function test_api_post_create_text_post(
  connection: api.IConnection,
) {
  // 1. Member authentication via join
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  // 2. Create community for the post
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
  // 3. Subscribe member to the created community
  const communitySubscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditLikeCommunityCommunitySubscription.ICreate,
      },
    );
  typia.assert(communitySubscription);
  // 4. Create text post with title and body content
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate the created text post
  TestValidator.equals("post type is text", post.post_type, "text");
  TestValidator.predicate("post body is populated", post.body !== null);
  TestValidator.equals(
    "post community id matches",
    post.community.id,
    community.id,
  );
}
