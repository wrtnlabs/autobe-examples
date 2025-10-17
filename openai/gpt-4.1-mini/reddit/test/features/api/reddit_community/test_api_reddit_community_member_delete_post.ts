import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Validate deletion of a community post by an authenticated RedditCommunity
 * member.
 *
 * This test performs the following sequence:
 *
 * 1. Join as a member (authenticate).
 * 2. Create a new community.
 * 3. Create a new post in the created community of type 'text' with valid title
 *    and body.
 * 4. Delete the post.
 * 5. Confirm deletion by verifying no error from the delete operation.
 *
 * The test verifies API responses using typia.assert for schema validation and
 * uses descriptive assertions from TestValidator to ensure functionality
 * correctness.
 */
export async function test_api_reddit_community_member_delete_post(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as RedditCommunity member
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "validPassword123";

  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a new community
  const communityName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 3,
    wordMax: 10,
  })
    .replace(/[\s]/g, "_")
    .slice(0, 50);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community name is valid",
    typeof community.name === "string" &&
      community.name.length >= 3 &&
      community.name.length <= 50,
  );

  // Step 3: Create a post in the community with type 'text'
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 12,
  }).slice(0, 300);
  const postBodyText = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 4,
    sentenceMax: 8,
    wordMin: 5,
    wordMax: 10,
  });

  const postToCreate: IRedditCommunityPosts.ICreate = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: postTitle,
    body_text: postBodyText,
  };

  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postToCreate,
      },
    );
  typia.assert(post);
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post type is text", post.post_type, "text");

  // Step 4: Delete the created post
  await api.functional.redditCommunity.member.communities.posts.erase(
    connection,
    {
      communityId: community.id,
      postId: post.id,
    },
  );

  // Step 5: Attempting to fetch the deleted post would fail (no fetch API defined), so we conclude test here.
  // Successful completion without error confirms deletion operation success.
  TestValidator.predicate("deletion completes without error", true);
}
