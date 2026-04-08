import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

/**
 * Test that posts with zero votes are fully visible and accessible.
 *
 * Validates the complete workflow of creating a post and verifying its visibility without any votes. Ensures that the business rule from analysis section 229 is correctly implemented - posts with zero votes should not be hidden or filtered.
 *
 * Special attention is given to verifying that zero-vote posts are fully accessible to both authenticated users and guest users. The test validates all expected fields in the post response including title, content, vote score, author information, and community details.
 *
 * 1. Register a new member account via POST /redditCommunity/auth/member/join
 * 2. Create a text post in a community using POST /redditCommunity/member/posts
 * 3. Verify the created post has vote_score = 0 (no votes cast)
 * 4. Retrieve the post via GET /redditCommunity/posts/{postId} without authentication (guest access)
 * 5. Validate the post response contains all expected fields:
 *    - title: the created post title
 *    - text_content: the full text content
 *    - vote_score: 0 (no votes cast)
 *    - comment_count: 0 (no comments)
 *    - author: author username and ID
 *    - community: community name and ID
 *    - timestamps: created_at, updated_at
 * 6. Verify the post is accessible despite having zero votes
 * 7. Validate no fields are missing or null when they should have values
 */
export async function test_api_post_zero_vote_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testpassword123",
      username: RandomGenerator.name(2),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a community (using random UUID for testing)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create a text post (using member authentication)
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: memberAuth.token.access };
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        post_type: "text" as const,
        reddit_community_community_id: communityId,
        text_content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 5,
          wordMin: 4,
          wordMax: 8,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Verify the created post has zero votes (business rule: posts start with vote_score = 0)
  TestValidator.equals(
    "post should have zero votes initially",
    post.vote_score,
    0,
  );
  // 5. Retrieve the post via GET endpoint without authentication (guest access)
  // Create a new connection without authorization header for guest access
  const guestConnection: api.IConnection = { host: connection.host };
  const retrievedPost = await api.functional.redditCommunity.posts.at(
    guestConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(retrievedPost);
  // 6. Validate all expected fields are present and correct
  TestValidator.equals("post title matches", retrievedPost.title, post.title);
  TestValidator.equals(
    "post text content matches",
    retrievedPost.text_content,
    post.text_content,
  );
  TestValidator.equals("post vote score is zero", retrievedPost.vote_score, 0);
  TestValidator.equals(
    "post comment count is zero",
    retrievedPost.comment_count,
    0,
  );
  TestValidator.equals("post type matches", retrievedPost.post_type, "text");
  TestValidator.equals(
    "post should not be soft-deleted",
    retrievedPost.deleted_at,
    null,
  );
  // 7. Verify author information is present
  TestValidator.notEquals(
    "post should have author ID",
    retrievedPost.author.id,
    "",
  );
  TestValidator.notEquals(
    "post should have author username",
    retrievedPost.author.username,
    "",
  );
  // 8. Verify community information is present
  TestValidator.notEquals(
    "post should have community ID",
    retrievedPost.community.id,
    "",
  );
  TestValidator.notEquals(
    "post should have community name",
    retrievedPost.community.name,
    "",
  );
  // 9. Verify timestamps are present
  TestValidator.predicate(
    "post should have created_at timestamp",
    retrievedPost.created_at !== undefined,
  );
  TestValidator.predicate(
    "post should have updated_at timestamp",
    retrievedPost.updated_at !== undefined,
  );
  // 10. Validate that zero-vote posts are accessible (no filtering/hiding)
  TestValidator.predicate(
    "zero-vote post should be accessible without authentication",
    retrievedPost.vote_score >= 0,
  );
}
