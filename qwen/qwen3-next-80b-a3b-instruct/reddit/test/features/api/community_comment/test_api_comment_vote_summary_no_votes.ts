import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVote";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

// Define the missing summary type based on usage
interface ICommunityCommentVoteSummary {
  total_upvotes: number;
  total_downvotes: number;
  net_score: number;
}

export async function test_api_comment_vote_summary_no_votes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: typia.random<ICommunityMember.IJoin>(),
  });
  // 2. Generate a random comment ID for which we'll request vote summary
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the vote summary endpoint with the new comment ID
  const voteSummary =
    await api.functional.community.member.comments.vote_summary.at(
      memberConnection,
      {
        commentId,
      }
    );
  // Cast to inferred summary type with validation
  const summed = typia.assert<ICommunityCommentVoteSummary>(voteSummary);
  // 4. Validate the zero-initialized vote summary values
  TestValidator.equals("total_upvotes is 0", summed.total_upvotes, 0);
  TestValidator.equals("total_downvotes is 0", summed.total_downvotes, 0);
  TestValidator.equals("net_score is 0", summed.net_score, 0);
}