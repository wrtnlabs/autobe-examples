import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_comments_vote_scores_filter_vote_counts(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as admin using join
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test filtering by minimum upvote count to identify popular comments
  const highUpvoteResponse =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_upvotes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          page: 1,
          limit: 10,
          sort_by: "upvote_count",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(highUpvoteResponse);
  // Test filtering by minimum downvote count to detect controversial content
  const highDownvoteResponse =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_downvotes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<50>
          >(),
          page: 1,
          limit: 10,
          sort_by: "score",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(highDownvoteResponse);
  // Test filtering by both upvote and downvote thresholds
  const balancedResponse =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_upvotes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<5> & tags.Maximum<20>
          >(),
          minimum_downvotes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<15>
          >(),
          page: 1,
          limit: 10,
          sort_by: "score",
          sort_order: "asc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(balancedResponse);
  // Test filtering for controversial comments (high engagement, neutral score)
  const controversialResponse =
    await api.functional.communityPlatform.admin.comments.vote_scores.index(
      adminConnection,
      {
        body: {
          minimum_upvotes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<100>
          >(),
          minimum_downvotes: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<15> & tags.Maximum<80>
          >(),
          minimum_score: -10,
          maximum_score: 10,
          page: 1,
          limit: 10,
          sort_by: "last_updated_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(controversialResponse);
  // Validate pagination structure for all responses
  const responses = [
    highUpvoteResponse,
    highDownvoteResponse,
    balancedResponse,
    controversialResponse,
  ];
  responses.forEach((response, index) => {
    TestValidator.predicate(
      `response ${index} has pagination`,
      response.pagination !== undefined,
    );
    TestValidator.predicate(
      `response ${index} has valid current page`,
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      `response ${index} has valid limit`,
      response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `response ${index} has valid records count`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `response ${index} has valid pages count`,
      response.pagination.pages >= 0,
    );
  });
  // Validate data structure for any non-empty responses
  responses.forEach((response, index) => {
    if (response.data.length > 0) {
      const item = response.data[0];
      TestValidator.predicate(
        `response ${index} item has upvote count`,
        item.upvote_count >= 0,
      );
      TestValidator.predicate(
        `response ${index} item has downvote count`,
        item.downvote_count >= 0,
      );
      TestValidator.equals(
        `response ${index} item score calculation`,
        item.score,
        item.upvote_count - item.downvote_count,
      );
      TestValidator.predicate(
        `response ${index} item has valid timestamp`,
        new Date(item.last_updated_at) instanceof Date,
      );
      TestValidator.predicate(
        `response ${index} item has comment ID`,
        typeof item.comment_id === "string",
      );
    }
  });
  // Test that filtering actually works by comparing response sizes
  if (
    highUpvoteResponse.data.length > 0 &&
    highDownvoteResponse.data.length > 0
  ) {
    TestValidator.notEquals(
      "different filters return different data",
      highUpvoteResponse.data.length,
      highDownvoteResponse.data.length,
    );
  }
}