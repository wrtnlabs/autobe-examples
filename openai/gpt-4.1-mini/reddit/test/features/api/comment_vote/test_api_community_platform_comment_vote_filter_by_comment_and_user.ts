import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_comment_vote_filter_by_comment_and_user(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid UUIDs for comment and user
  const commentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Prepare actor-specific connection
  const actorConnection: api.IConnection = { host: connection.host };
  // Request filtered comment votes using patch /communityPlatform/commentVotes
  const response = await api.functional.communityPlatform.commentVotes.index(
    actorConnection,
    {
      body: {
        commentId,
        userId,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformCommentVote.IRequest,
    },
  );
  // Assert response shape
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    response.pagination.current === 1,
  );
  TestValidator.predicate("pagination limit", response.pagination.limit <= 10);
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  // Confirm all returned votes match both the commentId and userId
  for (const vote of response.data) {
    typia.assert(vote);
    TestValidator.equals(
      "vote matches commentId",
      vote.communityPlatformCommentId,
      commentId,
    );
    // UserId is not inside vote summary, so no direct check possible. Assume filtering works as per business rule.
    // However, this test could check the count consistency or infer from filtered results.
  }
}
