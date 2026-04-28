import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
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
 * A member creates a link post with an external URL in a community, then the public GET endpoint retrieves it by postId.
 *
 * Validates the complete link post creation and retrieval flow including member registration, community creation, subscription establishment, link post creation with external URL, and post retrieval verification. Ensures that the returned post contains the correct post_type as 'link', the url field is populated with the provided external URL, and nullable fields like body and postImage are null for link posts.
 *
 * The test verifies that author and community fields return proper summary objects with expected fields. It also confirms that vote_score and comment_count are zero for a newly created post, and that the title matches the input title.
 *
 * 1. Register a new member using authorize_member_join utility to establish an authenticated session.
 * 2. Create a community using the member/communities.create API.
 * 3. Subscribe the member to the community using member/community_subscriptions.create API.
 * 4. Create a link post with post_type='link' and external url in the subscribed community using member/posts.create.
 * 5. Retrieve the post by postId using the public posts.at API.
 * 6. Validate post_type equals 'link'.
 * 7. Validate url field contains the external URL provided during creation.
 * 8. Validate body field is null for link posts.
 * 9. Validate postImage field is null for link posts.
 * 10. Validate author contains member summary with id, username, email, created_at.
 * 11. Validate community contains community summary with id, name, description.
 * 12. Validate vote_score is 0.
 * 13. Validate comment_count is 0.
 * 14. Validate title matches the title provided during creation.
 */
export async function test_api_post_retrieve_link_post_url(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IREdditLikeCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await api.functional.redditLikeCommunity.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
        } satisfies IREdditLikeCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await api.functional.redditLikeCommunity.member.community_subscriptions.create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create link post with external URL
  const title = RandomGenerator.paragraph({ sentences: 3 });
  const externalUrl = typia.random<string & tags.Format<"uri">>();
  const post = await api.functional.redditLikeCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title,
        post_type: "link",
        community_id: community.id,
        url: externalUrl,
      } satisfies IREdditLikeCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Retrieve the post by postId using public endpoint
  const publicConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditLikeCommunity.posts.at(
    publicConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 6. Validate post_type equals 'link'
  TestValidator.equals("post_type is link", retrievedPost.post_type, "link");
  // 7. Validate url field contains the external URL provided during creation
  TestValidator.equals("url matches input", retrievedPost.url!, externalUrl);
  // 8. Validate body field is null for link posts
  TestValidator.equals("body is null for link post", retrievedPost.body, null);
  // 9. Validate postImage field is null for link posts
  TestValidator.equals(
    "postImage is null for link post",
    retrievedPost.postImage,
    null,
  );
  // 10. Validate author contains member summary
  TestValidator.equals(
    "author id matches member",
    retrievedPost.author.id,
    member.id,
  );
  // 11. Validate community contains community summary
  TestValidator.equals(
    "community id matches created community",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches created community",
    retrievedPost.community.name,
    community.name,
  );
  // 12. Validate vote_score is 0
  TestValidator.equals("vote_score is 0", retrievedPost.vote_score, 0);
  // 13. Validate comment_count is 0
  TestValidator.equals("comment_count is 0", retrievedPost.comment_count, 0);
  // 14. Validate title matches the title provided during creation
  TestValidator.equals("title matches input", retrievedPost.title, title);
}