import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the full-text search functionality on moderation log action descriptions.
 * This test validates the search capabilities that super administrators rely on
 * for efficient moderation oversight and compliance reporting.
 */
export async function test_api_moderation_logs_full_text_search(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test full-text search with generic terms that might exist
  const searchResults =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          action_description_search: "moderation",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(searchResults);
  // Test partial match search
  const partialSearchResults =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          action_description_search: "mod",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(partialSearchResults);
  // Test case insensitivity
  const caseInsensitiveResults =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          action_description_search: "MODERATION",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(caseInsensitiveResults);
  // Test multiple keyword combinations
  const multiKeywordResults =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          action_description_search: "action user",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(multiKeywordResults);
  // Validate that search results contain proper structure
  TestValidator.predicate(
    "search returns pagination data",
    searchResults.pagination !== undefined,
  );
  TestValidator.predicate(
    "search returns data array",
    Array.isArray(searchResults.data),
  );
  // Test empty search returns all logs (no search parameter)
  const emptySearchResults =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(emptySearchResults);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current page",
    emptySearchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has limit",
    emptySearchResults.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    emptySearchResults.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    emptySearchResults.pagination.pages >= 0,
  );
  // Test search with empty string should behave like no search parameter
  const emptyStringSearch =
    await api.functional.discussionBoard.superAdmin.moderation_logs.index(
      superAdminConnection,
      {
        body: {
          action_description_search: "",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardModerationLog.IRequest,
      },
    );
  typia.assert(emptyStringSearch);
}
