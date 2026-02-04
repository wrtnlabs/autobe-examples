import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_vote_update_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to perform vote operations
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a community for the post
  const communityName: string = RandomGenerator.alphabets(8);
  const post: ICommunityPlatformPost =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityName,
        },
        body: {
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          text: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 15,
            sentenceMax: 25,
          }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // Step 3: Create a comment on the post to receive votes
  const comment: ICommunityPlatformComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({
            sentences: 4,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 4: There's no way to retrieve comment score from the returned object
  // The system sends the vote update request and applies the change server-side
  // We can only verify that the operations succeed without errors
  // Step 5: Update vote from no vote to upvote (+1)
  await api.functional.communityPlatform.member.posts.comments.votes.updateVote(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: {
        vote_type: 1,
      } satisfies ICommunityPlatformCommentVote.IRequest,
    },
  );
  // Step 6: Update vote from upvote to downvote (-1)
  await api.functional.communityPlatform.member.posts.comments.votes.updateVote(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: {
        vote_type: -1,
      } satisfies ICommunityPlatformCommentVote.IRequest,
    },
  );
  // Step 7: Update vote from downvote to remove (0) - removes the downvote
  await api.functional.communityPlatform.member.posts.comments.votes.updateVote(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
      body: {
        vote_type: 0,
      } satisfies ICommunityPlatformCommentVote.IRequest,
    },
  );
  // Final verification: Ensure member karma is correct
  // The specification states karma should be adjusted based on votes, but there is no endpoint to retrieve member karma
  // The test validates the comment vote operations through all states correctly
  // Verify that the system enforces authentication (unauthenticated requests should fail)
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("guest cannot update vote", async () => {
    await api.functional.communityPlatform.member.posts.comments.votes.updateVote(
      guestConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          vote_type: 1,
        } satisfies ICommunityPlatformCommentVote.IRequest,
      },
    );
  });
}
