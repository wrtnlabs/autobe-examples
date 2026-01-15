import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentVote";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_vote_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as citizen
  const citizenConnection: api.IConnection = { host: connection.host };
  const citizen = await authorize_member_join(citizenConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(citizen);
  // Step 2: Try to retrieve a non-existent vote ID owned by the citizen
  // Since we cannot create a vote (no API endpoint exists for it),
  // we use a randomly generated UUID as voteId that will not exist
  const nonExistentVoteId = typia.random<string & tags.Format<"uuid">>();
  // Expect HTTP 404 error since voteId doesn't exist
  await TestValidator.error(
    "should return 404 for non-existent vote",
    async () => {
      await api.functional.discussionBoard.comment_votes.at(citizenConnection, {
        voteId: nonExistentVoteId,
      });
    },
  );
}
