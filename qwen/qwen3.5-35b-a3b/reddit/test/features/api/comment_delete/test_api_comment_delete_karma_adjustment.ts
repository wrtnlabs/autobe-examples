import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_vote_create } from "../../../generate/generate_random_reddit_platform_member_comments_vote_create";
import { prepare_random_reddit_platform_comment_vote } from "../../../prepare/prepare_random_reddit_platform_comment_vote";

export async function test_api_comment_delete_karma_adjustment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create comment author member
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const commentAuthor = await authorize_member_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com/ref",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(commentAuthor);
  // 2. Create voter member
  const voterConnection: api.IConnection = { host: connection.host };
  const voter = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: "https://example.com/register",
      referrer: "https://example.com/ref",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(voter);
  // 3. Create comment (use random since ICreate type uses any | any placeholder)
  const comment: IRedditPlatformComment =
    await api.functional.redditPlatform.member.comments.create(
      commentAuthorConnection,
      {
        body: typia.random<IRedditPlatformComment.ICreate>(),
      },
    );
  typia.assert(comment);
  // 4. Cast 3 upvotes from voter
  await api.functional.redditPlatform.member.comments.vote.create(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "UPVOTE",
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(typia.assert);
  await api.functional.redditPlatform.member.comments.vote.create(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "UPVOTE",
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(typia.assert);
  await api.functional.redditPlatform.member.comments.vote.create(
    voterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "UPVOTE",
      } satisfies IRedditPlatformCommentVote.ICreate,
    },
  );
  typia.assert(typia.assert);
  // 5. Record comment author's karma before deletion
  const statsBefore = await api.functional.redditPlatform.member.profile.stats(
    commentAuthorConnection,
  );
  typia.assert(statsBefore);
  const karmaBefore = statsBefore.karma_score;
  // 6. Delete the comment
  await api.functional.redditPlatform.member.comments.erase(
    commentAuthorConnection,
    {
      commentId: comment.id,
    },
  );
  // 7. Verify karma decreased by exactly 3 (number of upvotes)
  const statsAfter = await api.functional.redditPlatform.member.profile.stats(
    commentAuthorConnection,
  );
  typia.assert(statsAfter);
  const karmaAfter = statsAfter.karma_score;
  // Karma should have decreased by the number of upvotes
  TestValidator.equals(
    "karma decreased by upvote count",
    karmaAfter,
    karmaBefore - 3,
  );
  // 8. Verify comment deletion was processed
  TestValidator.predicate("comment was deleted", karmaAfter < karmaBefore);
}
