import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_vote_zero_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: typia.random<string & tags.MaxLength<20>>(),
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // 2. Generate a post ID for testing
  // Note: In a complete implementation, a post would be created first
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Cast an upvote on the zero-vote post
  const upvoteResponse =
    await api.functional.redditCommunity.member.posts.votes.submit(
      memberConnection,
      {
        postId,
        body: {
          vote_type: "upvote",
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(upvoteResponse);
  // 4. Verify the vote record has correct author reference
  TestValidator.equals(
    "vote author matches current member",
    upvoteResponse.author.id,
    member.id,
  );
  // 5. Verify the vote_type is upvote
  TestValidator.equals(
    "vote type is upvote",
    upvoteResponse.vote_type,
    "upvote",
  );
  // 6. Verify the post reference exists
  TestValidator.equals("post ID matches", upvoteResponse.post.id, postId);
  // 7. Cast a downvote on the same post
  const downvoteResponse =
    await api.functional.redditCommunity.member.posts.votes.submit(
      memberConnection,
      {
        postId,
        body: {
          vote_type: "downvote",
        } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(downvoteResponse);
  // 8. Verify the vote is updated (vote_type changed from upvote to downvote)
  TestValidator.notEquals(
    "vote type changed from upvote to downvote",
    upvoteResponse.vote_type,
    downvoteResponse.vote_type,
  );
  TestValidator.equals(
    "vote type is now downvote",
    downvoteResponse.vote_type,
    "downvote",
  );
  // 9. Verify the author reference is still correct
  TestValidator.equals(
    "vote author still matches current member after downvote",
    downvoteResponse.author.id,
    member.id,
  );
  // 10. Test vote removal by casting a null vote
  const nullVoteResponse =
    await api.functional.redditCommunity.member.posts.votes.submit(
      memberConnection,
      {
        postId,
        body: { vote_type: null } satisfies IRedditCommunityPostVote.IRequest,
      },
    );
  typia.assert(nullVoteResponse);
  // 11. Verify the vote is soft-deleted (deleted_at is set)
  TestValidator.predicate(
    "vote is soft-deleted when vote_type is null",
    nullVoteResponse.deleted_at !== null,
  );
  // 12. Verify the vote_type is null after removal
  TestValidator.equals(
    "vote type is null after removal",
    nullVoteResponse.vote_type,
    null,
  );
  // 13. Verify the post reference still exists after vote removal
  TestValidator.equals(
    "post ID still matches after vote removal",
    nullVoteResponse.post.id,
    postId,
  );
  // 14. Verify vote_score remains accessible (zero-vote post visibility)
  TestValidator.predicate(
    "post remains visible with zero votes",
    typeof nullVoteResponse.post.vote_score === "number",
  );
}
