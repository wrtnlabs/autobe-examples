import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_comments_replies_create } from "../../../generate/generate_random_community_platform_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_vote_conversion_up_to_down(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Join as a member to get authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const joinedMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(joinedMember);
  // Step 2: Create a parent comment on a post using generation function
  const postCommentContent = RandomGenerator.paragraph();
  const parentComment: ICommunityPlatformComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: postCommentContent,
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          postId: typia.random<string>(),
        },
      },
    );
  typia.assert(parentComment);
  // Step 3: Create a reply to the parent comment using generation function
  const replyContent = RandomGenerator.paragraph();
  const reply: ICommunityPlatformComment =
    await generate_random_community_platform_member_comments_replies_create(
      memberConnection,
      {
        body: {
          content: replyContent,
        } satisfies ICommunityPlatformComment.ICreate,
        params: {
          commentId: parentComment.id,
        },
      },
    );
  typia.assert(reply);
  // Step 4: Upvote the reply to establish initial vote state
  const upvoteResponse: ICommunityPlatformComment.IVoteStatus =
    await api.functional.communityPlatform.member.comments.replies.votes.upvote(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
        body: {
          action: "up",
        } satisfies ICommunityPlatformComment.IRequestVote,
      },
    );
  typia.assert(upvoteResponse);
  TestValidator.equals("initial vote status is up", upvoteResponse.value, "up");
  TestValidator.predicate(
    "initial vote score is positive",
    upvoteResponse.score > 0,
  );
  const initialScore = upvoteResponse.score;
  // Step 5: Convert the upvote to a downvote to trigger the -2 change
  const downvoteResponse: ICommunityPlatformComment.IVoteStatus =
    await api.functional.communityPlatform.member.comments.replies.votes.upvote(
      memberConnection,
      {
        commentId: parentComment.id,
        replyId: reply.id,
        body: {
          action: "down",
        } satisfies ICommunityPlatformComment.IRequestVote,
      },
    );
  typia.assert(downvoteResponse);
  // Step 6: Validate the vote conversion change (-2 change confirmed)
  TestValidator.equals(
    "vote status converted to down",
    downvoteResponse.value,
    "down",
  );
  TestValidator.equals(
    "vote score decreased by 2",
    downvoteResponse.score,
    initialScore - 2,
  );
}
