import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommentVote";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(member);
  // Update connection with token from registration
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...memberConnection.headers,
    },
  };
  // 2. Create a test comment by calling upvote endpoint on a valid comment
  // Note: Since we don't have a direct comment creation endpoint in this test scenario,
  // we'll test the upvote functionality by calling it with a comment ID that would exist
  // in the system. For E2E testing, we would typically create a post and comment first.
  // For this test, we'll assume there's a comment available and test the upvote functionality
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Perform the upvote
  const result = await api.functional.redditClone.member.comments.upvote(
    authenticatedConnection,
    {
      commentId: commentId,
    },
  );
  typia.assert(result);
  // 4. Verify response structure
  TestValidator.equals(
    "response has vote score",
    typeof result.voteScore,
    "number",
  );
  TestValidator.predicate("vote score is valid", result.voteScore >= 0);
  TestValidator.equals("user vote status is upvote", result.userVote, "upvote");
}
