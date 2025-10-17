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
 * End-to-End test for post vote creation by member.
 *
 * This test simulates a complete user workflow that validates member
 * authentication, community creation, post creation, and finally voting on the
 * post.
 *
 * Steps:
 *
 * 1. Member registration and authentication.
 * 2. Community creation with valid parameters.
 * 3. Post creation in the created community with defined content.
 * 4. Voting on the post by the member with a valid vote value (+1).
 * 5. Validation of all returned data including vote record correctness and type
 *    validation.
 *
 * The test ensures role-based access control and data integrity in the vote
 * creation process.
 */
export async function test_api_post_vote_creation_by_member(
  connection: api.IConnection,
) {
  // 1. Member registration and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "password123";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a community
  const communityName = `community_${RandomGenerator.alphaNumeric(6)}`;
  const communityBody = {
    name: communityName,
    description: "A community for testing post votes",
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  TestValidator.equals("community name", community.name, communityBody.name);

  // 3. Create a post in the community
  const postBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: "Test Post for Voting",
    body_text: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  TestValidator.equals("post.title", post.title, postBody.title);
  TestValidator.equals(
    "post.community id",
    post.reddit_community_community_id,
    community.id,
  );

  // 4. Create a post vote by the member
  const voteBody = {
    member_id: member.id,
    post_id: post.id,
    vote_value: 1, // upvote
  } satisfies IRedditCommunityPostVote.ICreate;
  const postVote: IRedditCommunityPostVote =
    await api.functional.redditCommunity.member.posts.postVotes.createPostVote(
      connection,
      {
        postId: post.id,
        body: voteBody,
      },
    );

  // Validate vote
  typia.assert(postVote);
  TestValidator.equals("vote member id", postVote.member_id, member.id);
  TestValidator.equals("vote post id", postVote.post_id, post.id);
  TestValidator.equals("vote value", postVote.vote_value, 1);
  TestValidator.predicate(
    "vote created_at format",
    typeof postVote.created_at === "string" && postVote.created_at.length > 0,
  );
  TestValidator.predicate(
    "vote updated_at format",
    typeof postVote.updated_at === "string" && postVote.updated_at.length > 0,
  );
}
