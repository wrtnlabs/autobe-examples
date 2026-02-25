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
 * Test creating a TEXT post in a subscribed community.
 *
 * Verifies:
 * 1. Post is created successfully with correct title and text_content
 * 2. Author's karma increases by +1 due to automatic self-upvote
 * 3. Vote counts are initialized correctly (vote_score=1, upvote_count=1, downvote_count=0)
 * 4. Comment count is 0
 * 5. Response includes complete post with author and community summary objects
 * 6. Created timestamp is set correctly
 * 7. Post type is TEXT with textContent populated
 */
export async function test_api_post_creation_text_type(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Store initial karma (should be 0 for new member)
  const initialKarma = member.karma;
  // Step 2: Create a community (member becomes owner and is auto-subscribed)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Create a TEXT post (creator is already subscribed)
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityName: community.name,
      body: {
        title: postTitle,
        post_type: "TEXT",
        text_content: postContent,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Verify post properties
  TestValidator.equals("post title", post.title, postTitle);
  TestValidator.equals("post type", post.postType, "TEXT");
  TestValidator.equals("text content", post.textContent, postContent);
  TestValidator.equals("vote score", post.voteScore, 1);
  TestValidator.equals("upvote count", post.upvoteCount, 1);
  TestValidator.equals("downvote count", post.downvoteCount, 0);
  TestValidator.equals("comment count", post.commentCount, 0);
  // Step 5: Verify author information
  TestValidator.equals("author id", post.author.id, member.id);
  TestValidator.equals(
    "author username",
    post.author.username,
    member.username,
  );
  // Step 6: Verify community information
  TestValidator.equals("community id", post.community.id, community.id);
  TestValidator.equals("community name", post.community.name, community.name);
  // Step 7: Verify timestamps exist
  TestValidator.predicate(
    "created_at is valid date",
    new Date(post.createdAt).getTime() > 0,
  );
  TestValidator.equals("edited_at is null", post.editedAt, null);
  // Step 8: Verify nullable fields for TEXT post
  TestValidator.equals("linkUrl is null for TEXT post", post.linkUrl, null);
  TestValidator.equals("imageUrl is null for TEXT post", post.imageUrl, null);
  TestValidator.equals(
    "imageThumbnailUrl is null for TEXT post",
    post.imageThumbnailUrl,
    null,
  );
  // Step 9: Verify author's karma increased by 1 due to self-upvote
  TestValidator.equals(
    "author karma increased by 1",
    post.author.karma,
    initialKarma + 1,
  );
}
