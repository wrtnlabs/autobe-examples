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
export async function test_api_comment_reply_upvote_first_time(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a comment on a post
  // Since we don't have a post creation endpoint, we'll use a random UUID as the postId
  const postId = typia.random<string & tags.Format<"uuid">>();
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId,
        body: {
          content: commentContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Step 3: Create a reply to the comment
  const replyContent = RandomGenerator.paragraph({ sentences: 2 });
  const reply: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.replies.create(
      memberConnection,
      {
        commentId: comment.id,
        body: {
          content: replyContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(reply);
  // Step 4: Perform first upvote on the reply
  const voteResult: ICommunityPlatformComment.IVoteStatus =
    await api.functional.communityPlatform.member.comments.replies.votes.upvote(
      memberConnection,
      {
        commentId: comment.id,
        replyId: reply.id,
        body: {
          action: "up",
        } satisfies ICommunityPlatformComment.IRequestVote,
      },
    );
  typia.assert(voteResult);
  // Step 5: Verify vote status was updated correctly
  TestValidator.equals("vote status is 'up'", voteResult.value, "up");
  TestValidator.equals("reply vote score increased by 1", voteResult.score, 1);
  // Step 6: Verify member karma was increased by 1
  // Login with the same email used in registration
  const updatedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.communityPlatform.auth.member.login(memberConnection, {
      body: {
        email, // Using stored email from join
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformMember.ILogin,
    });
  typia.assert(updatedMember);
  TestValidator.equals(
    "member karma increased by 1",
    updatedMember.karma,
    member.karma + 1,
  );
}
