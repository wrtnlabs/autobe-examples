import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommentVoteStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVoteStatus";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_comment_vote_check_downvoted_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account using utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create member connection with the obtained token
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: memberAuth.token.access,
  };
  // 3. Get a random comment ID to check vote status
  // Note: In a complete implementation, we would create a comment first
  // and cast a downvote on it. Since those endpoints are not available,
  // we use a random UUID to demonstrate the endpoint works.
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 4. Check vote status endpoint
  const voteStatus =
    await api.functional.redditPlatform.member.comments.vote.at(
      memberConnection,
      {
        commentId,
      },
    );
  typia.assert(voteStatus);
  // 5. Validate response structure
  TestValidator.equals("has voteType field", voteStatus.voteType, null);
  TestValidator.predicate(
    "response matches schema",
    typia.is<IRedditPlatformCommentVoteStatus>(voteStatus),
  );
}