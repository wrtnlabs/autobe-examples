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

export async function test_api_comment_vote_summary_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResponse = await authorize_member_join(memberConnection, {
    body: {} satisfies ICommunityMember.IJoin,
  });
  typia.assert(memberResponse);
  // 2. Create a random comment ID for testing
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Fetch the vote summary for the comment
  const voteSummary =
    await api.functional.community.member.comments.vote_summary.at(
      memberConnection,
      {
        commentId,
      },
    );
  typia.assert(voteSummary);
  // 4. Validate the returned vote summary has expected structure based on API specification
  // According to API specification, response should contain total_upvotes, total_downvotes, and net_score
  // Use satisfies pattern to extract properties that exist in the actual response despite empty DTO
  const totalUpvotes = voteSummary satisfies unknown as {
    total_upvotes: number;
    total_downvotes: number;
    net_score: number;
  };
  // Validate logical relationship: net_score = upvotes - downvotes
  TestValidator.equals(
    "net_score equals upvotes minus downvotes",
    totalUpvotes.net_score,
    totalUpvotes.total_upvotes - totalUpvotes.total_downvotes,
  );
  // Validate that values are non-negative as per materialized view contract
  TestValidator.predicate(
    "total_upvotes is non-negative",
    totalUpvotes.total_upvotes >= 0,
  );
  TestValidator.predicate(
    "total_downvotes is non-negative",
    totalUpvotes.total_downvotes >= 0,
  );
}
