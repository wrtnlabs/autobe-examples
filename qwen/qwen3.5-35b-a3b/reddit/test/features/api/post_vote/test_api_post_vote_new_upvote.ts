import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
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

export async function test_api_post_vote_new_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins the platform
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: typia.random<IRedditPlatformMember.IJoin>(),
  });
  typia.assert(memberAuthorized);
  // 2. Cast upvote on a post
  const voteBody = {
    vote_type: "UPVOTE",
  } satisfies IRedditPlatformPost.IVoteRequest;
  const postResponse =
    await api.functional.redditPlatform.member.posts.vote.updateVote(
      memberConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: voteBody,
      },
    );
  typia.assert(postResponse);
  // 3. Validate response structure
  TestValidator.predicate(
    "post has valid ID",
    postResponse.id !== null && postResponse.id !== undefined,
  );
  TestValidator.predicate(
    "post has vote_score",
    postResponse.vote_score !== null && postResponse.vote_score !== undefined,
  );
  TestValidator.predicate(
    "post has valid author",
    postResponse.author !== null && postResponse.author !== undefined,
  );
  TestValidator.predicate(
    "post author has username",
    postResponse.author.username !== null &&
      postResponse.author.username !== undefined,
  );
  TestValidator.predicate(
    "post has vote_type UPVOTE",
    postResponse.vote_score !== null,
  );
  TestValidator.predicate(
    "member karma score is valid int32",
    memberAuthorized.karma_score !== null &&
      memberAuthorized.karma_score !== undefined,
  );
  TestValidator.predicate(
    "member is active",
    memberAuthorized.is_active === true,
  );
}
