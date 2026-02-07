import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentVoteSummary";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommentVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentVoteSummary";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_comment_vote_summaries_best_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection via utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
    } satisfies ICommunityMember.IJoin,
  });
  // Generate test comment vote summaries (20+ comments to ensure pagination works)
  const sampleCommentsCount = 25;
  const voteSummaries = ArrayUtil.repeat(
    sampleCommentsCount,
    () =>
      ({
        total_upvotes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        total_downvotes: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        net_score: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(), // non-negative
      }) satisfies ICommunityCommentVoteSummary,
  );
  // Mock server response using simulate mode (since we can't create actual data without write access)
  // The API response should be a pagination object with data array and pagination metadata
  const request: ICommunityCommentVoteSummary.IRequest = {
    sortAlgorithm: "best",
    page: 1,
    limit: 20,
  };
  // Execute API call using SDK function (no utility available for GET/PATCH on this endpoint)
  const result: IPageICommunityCommentVoteSummary =
    await api.functional.community.comments.vote_summaries.index(
      memberConnection,
      {
        body: request,
      },
    );
  // Validate total result structure and pagination
  typia.assert(result);
  // Validate pagination metadata
  TestValidator.equals("page number is 1", result.pagination.current, 1);
  TestValidator.equals("limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "records count >= 20",
    result.pagination.records >= 20,
  );
  TestValidator.equals(
    "pages calculated correctly",
    result.pagination.pages,
    Math.ceil(result.pagination.records / 20),
  );
  // Validate data array length - should be exactly limit (20), not more
  TestValidator.equals(
    "data array has exactly 20 items",
    result.data.length,
    20,
  );
  // Validate each summary has required fields
  result.data.forEach((summary, index) => {
    TestValidator.predicate("total_upvotes >= 0", summary.total_upvotes >= 0);
    TestValidator.predicate(
      "total_downvotes >= 0",
      summary.total_downvotes >= 0,
    );
    TestValidator.predicate("net_score >= 0", summary.net_score >= 0);
    // Validate net_score = total_upvotes - total_downvotes (business logic)
    TestValidator.equals(
      `net_score calculation ${index}`,
      summary.net_score,
      summary.total_upvotes - summary.total_downvotes,
    );
    // Validate all entries are ICommunityCommentVoteSummary
    typia.assert<ICommunityCommentVoteSummary>(summary);
  });
  // Validate sorting order
  // Sort should be by net_score DESC only (created_at is not part of the summary interface)
  // Check that each item is <= the previous item in net_score
  for (let i = 1; i < result.data.length; i++) {
    const currentItem = result.data[i];
    const prevItem = result.data[i - 1];
    // net_score must be strictly descending
    TestValidator.predicate(
      `net_score DESC at index ${i}`,
      currentItem.net_score < prevItem.net_score,
    );
  }
}