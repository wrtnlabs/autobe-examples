import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_vote_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create memberA (comment creator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create memberB (voter)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 3. MemberA creates a comment
  const commentBody = {
    reddit_platform_post_id: typia.random<string & tags.Format<"uuid">>(),
    content: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditPlatformComment.ICreate;
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberAConnection,
    { body: commentBody },
  );
  typia.assert(comment);
  // 4. MemberB casts an upvote
  const upvote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberBConnection,
      {
        commentId: comment.id,
        body: { vote_type: "up" } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(upvote);
  // Verify upvote was recorded
  TestValidator.equals("upvote recorded", upvote.vote_type, "up");
  // Store comment state before removal
  const upvotesCountBefore = upvote.comment.upvotes_count;
  const scoreBefore = upvote.comment.score;
  // 5. MemberB removes their vote (vote_type: null)
  const removeVote =
    await api.functional.redditPlatform.member.comments.vote.create(
      memberBConnection,
      {
        commentId: comment.id,
        body: { vote_type: null } satisfies IRedditPlatformCommentVote.ICreate,
      },
    );
  typia.assert(removeVote);
  // Validate vote_type is null (vote removed)
  TestValidator.equals("vote type removed", removeVote.vote_type, null);
  // 6. Validate comment counts were adjusted
  TestValidator.equals(
    "upvotes_count decreased after vote removal",
    removeVote.comment.upvotes_count,
    upvotesCountBefore - 1,
  );
  TestValidator.equals(
    "score decreased after vote removal",
    removeVote.comment.score,
    scoreBefore - 1,
  );
}
