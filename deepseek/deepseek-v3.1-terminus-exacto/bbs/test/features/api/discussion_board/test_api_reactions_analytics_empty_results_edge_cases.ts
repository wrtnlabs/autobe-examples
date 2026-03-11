import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleReaction";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleReaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleReaction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test edge cases for reaction analytics when no data matches the filtering criteria.
 * Validates that the system handles empty result sets gracefully by returning
 * appropriate pagination metadata with zero records.
 */
export async function test_api_reactions_analytics_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Test with non-existent reaction type
  const nonExistentReactionResponse =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          reaction_type: "non_existent_reaction_type_12345",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(nonExistentReactionResponse);
  // Validate empty pagination metadata
  TestValidator.equals(
    "non-existent reaction type should have zero records",
    nonExistentReactionResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent reaction type should have zero pages",
    nonExistentReactionResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent reaction type should have empty data array",
    nonExistentReactionResponse.data.length,
    0,
  );
  // 3. Test with future date range (no reactions possible)
  const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year in future
  const futureResponse =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          created_at_start: futureDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(futureResponse);
  TestValidator.equals(
    "future date range should have zero records",
    futureResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "future date range should have zero pages",
    futureResponse.pagination.pages,
    0,
  );
  // 4. Test with past date range (before any reactions existed)
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 100); // 100 years ago
  const pastResponse =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          created_at_end: pastDate.toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(pastResponse);
  TestValidator.equals(
    "past date range should have zero records",
    pastResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "past date range should have zero pages",
    pastResponse.pagination.pages,
    0,
  );
  // 5. Test with combination of non-existent type and date range
  const combinedResponse =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          reaction_type: "another_non_existent_type",
          created_at_start: futureDate.toISOString(),
          created_at_end: futureDate.toISOString(),
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(combinedResponse);
  TestValidator.equals(
    "combined filters should have zero records",
    combinedResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "combined filters should have zero pages",
    combinedResponse.pagination.pages,
    0,
  );
  // 6. Test pagination limits with empty results
  const limitResponse =
    await api.functional.discussionBoard.admin.reactions.analytics.index(
      adminConnection,
      {
        body: {
          reaction_type: "non_existent",
          page: 5, // High page number
          limit: 20, // Different limit
        } satisfies IDiscussionBoardArticleReaction.IRequest,
      },
    );
  typia.assert(limitResponse);
  TestValidator.equals(
    "high page number with non-existent data should have zero records",
    limitResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "high page number should still have zero pages",
    limitResponse.pagination.pages,
    0,
  );
}
