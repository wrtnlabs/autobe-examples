import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test creating a LINK post with a valid HTTP URL.
 * Verifies post creation with correct type, URL storage, null content fields,
 * and proper vote metric initialization including author's automatic upvote.
 */
export async function test_api_post_creation_link_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Store initial karma before post creation
  const initialKarma = member.karma;
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create a LINK post with valid HTTP URL
  const linkUrl = "https://example.com/article/12345";
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityName: community.name,
      body: {
        title: postTitle,
        post_type: "LINK",
        link_url: linkUrl,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Validate post creation - basic fields
  TestValidator.equals("post id exists", typeof post.id, "string");
  TestValidator.equals("title matches", post.title, postTitle);
  TestValidator.equals("post type is LINK", post.postType, "LINK");
  TestValidator.equals("link URL matches", post.linkUrl, linkUrl);
  // 6. Validate null content fields for LINK type
  TestValidator.equals("text content is null", post.textContent, null);
  TestValidator.equals("image URL is null", post.imageUrl, null);
  TestValidator.equals(
    "image thumbnail URL is null",
    post.imageThumbnailUrl,
    null,
  );
  // 7. Validate vote metrics (author auto-upvote)
  TestValidator.equals("vote score is 1", post.voteScore, 1);
  TestValidator.equals("upvote count is 1", post.upvoteCount, 1);
  TestValidator.equals("downvote count is 0", post.downvoteCount, 0);
  TestValidator.equals("comment count is 0", post.commentCount, 0);
  // 8. Validate author summary
  TestValidator.equals("author id matches", post.author.id, member.id);
  TestValidator.equals(
    "author username matches",
    post.author.username,
    member.username,
  );
  TestValidator.equals(
    "author karma increased by 1",
    post.author.karma,
    initialKarma + 1,
  );
  // 9. Validate community summary
  TestValidator.equals("community id matches", post.community.id, community.id);
  TestValidator.equals(
    "community name matches",
    post.community.name,
    community.name,
  );
  // 10. Validate timestamps
  TestValidator.predicate(
    "created_at is valid",
    post.createdAt !== null && post.createdAt !== undefined,
  );
  TestValidator.equals("edited_at is null initially", post.editedAt, null);
}
