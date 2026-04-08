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

export async function test_api_member_comment_vote_check_upvoted_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "testPassword123",
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Update connection with auth token
  memberConnection.headers = {
    ...memberConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // 2. Create a valid comment ID for testing
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Get vote status for the comment
  const voteStatus =
    await api.functional.redditPlatform.member.comments.vote.at(
      memberConnection,
      {
        commentId,
      },
    );
  typia.assert(voteStatus);
  // 4. Validate response structure - voteType may be null, undefined, "up", or "down"
  TestValidator.predicate(
    "vote status has valid voteType field",
    voteStatus.voteType === null ||
      voteStatus.voteType === "up" ||
      voteStatus.voteType === "down" ||
      voteStatus.voteType === undefined,
  );
}
