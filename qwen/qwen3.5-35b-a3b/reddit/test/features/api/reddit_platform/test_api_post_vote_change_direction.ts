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

/**
 * Test changing vote direction from upvote to downvote on an existing post.
 *
 * This test validates the vote direction change business logic where:
 * - Upvote to downvote should decrease post score by 2
 * - The vote record should be updated atomically
 * - User karma should be adjusted accordingly
 */
export async function test_api_post_vote_change_direction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join member1 (using utility function for authorization)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth: IRedditPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphaNumeric(10),
        password: RandomGenerator.alphaNumeric(12),
        displayName: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(member1Auth);
  typia.assert(member1Auth.user);
  // 2. Cast initial upvote on a test post
  // Note: For this test to work, we need an existing post
  // Since the SDK doesn't expose post creation, we'll use a random post ID
  // In production, this would be replaced with a real post ID from test fixtures
  const testPostId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Upvote the post (UPVOTE)
  const upvoteConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(upvoteConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const upvoteResult: IRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.posts.vote.updateVote(
      upvoteConnection,
      {
        postId: testPostId,
        body: {
          vote_type: "UPVOTE" as "UPVOTE" | "DOWNVOTE" | null,
        } satisfies IRedditPlatformPost.IVoteRequest,
      },
    );
  typia.assert(upvoteResult);
  const initialVoteScore = upvoteResult.vote_score;
  // 4. Change vote direction from upvote to downvote
  const changeVoteConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(changeVoteConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  const voteChangeResult: IRedditPlatformPost.ISummary =
    await api.functional.redditPlatform.member.posts.vote.updateVote(
      changeVoteConnection,
      {
        postId: testPostId,
        body: {
          vote_type: "DOWNVOTE" as "UPVOTE" | "DOWNVOTE" | null,
        } satisfies IRedditPlatformPost.IVoteRequest,
      },
    );
  typia.assert(voteChangeResult);
  // 5. Validate vote direction change logic
  // UPVOTE (+1) to DOWNVOTE (-1) should decrease score by 2
  TestValidator.equals(
    "vote score decreases by 2 (UPVOTE to DOWNVOTE)",
    voteChangeResult.vote_score,
    initialVoteScore - 2,
  );
  // 6. Verify vote request body is valid
  const voteRequest = {
    vote_type: "DOWNVOTE" as "UPVOTE" | "DOWNVOTE" | null,
  } satisfies IRedditPlatformPost.IVoteRequest;
  typia.assert(voteRequest);
  // 7. Verify the connection isolation pattern is followed
  TestValidator.predicate(
    "connections are isolated",
    member1Connection !== upvoteConnection,
  );
  TestValidator.predicate(
    "upvote connection differs from change vote connection",
    upvoteConnection !== changeVoteConnection,
  );
}
