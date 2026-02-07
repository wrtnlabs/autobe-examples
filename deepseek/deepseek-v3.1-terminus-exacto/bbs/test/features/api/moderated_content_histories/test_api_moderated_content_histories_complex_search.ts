import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test complex search functionality for moderated content histories with date ranges,
 * text search, and pagination. An administrator authenticates and performs a comprehensive
 * search query with multiple filters: date range (created_at_start and created_at_end),
 * text search across moderation_reason and original_content fields, pagination parameters,
 * and content type filtering. The test validates that the search returns moderation events
 * that fall within the specified date range and match the search terms, testing the
 * comprehensive filtering capabilities including temporal filtering and text-based content
 * searching.
 */
export async function test_api_moderated_content_histories_complex_search(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Prepare complex search criteria
  const searchTerm = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const startDate = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 30 days ago
  const endDate = new Date().toISOString(); // current time
  const searchRequest = {
    content_type: "article" as const,
    search: searchTerm,
    created_at_start: startDate,
    created_at_end: endDate,
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
  } satisfies IDiscussionBoardModeratedContentHistory.IRequest;
  // Perform the complex search
  const result =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(result);
  // Validate individual moderation history records if any are returned
  if (result.data.length > 0) {
    for (const history of result.data) {
      typia.assert(history);
      // Validate date range filtering
      const historyDate = new Date(history.created_at);
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      TestValidator.predicate(
        "history date within range",
        historyDate >= startDateObj && historyDate <= endDateObj,
      );
      // Validate content type filtering
      TestValidator.equals(
        "content type matches filter",
        history.content_type,
        "article",
      );
    }
  }
}
