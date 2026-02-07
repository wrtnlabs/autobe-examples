import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentModerationLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardContentModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test basic search functionality for content moderation logs.
 *
 * This test verifies that super administrators can search content moderation logs
 * with default parameters and receive properly paginated results in chronological
 * order (newest first). It also validates the structure of moderation log entries
 * and tests basic filtering capabilities.
 */
export async function test_api_moderation_logs_basic_search(
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
  // Test 1: Search with default parameters (no filters)
  const defaultSearch =
    await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
      superAdminConnection,
      {
        body: {
          page: undefined,
          limit: undefined,
          search: undefined,
          admin_id: undefined,
          action_type: undefined,
          target_content_type: undefined,
          created_at_from: undefined,
          created_at_to: undefined,
        } satisfies IDiscussionBoardContentModerationLog.IRequest,
      },
    );
  typia.assert(defaultSearch);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof defaultSearch.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page >= 0",
    defaultSearch.pagination.current >= 0,
  );
  TestValidator.predicate("limit >= 0", defaultSearch.pagination.limit >= 0);
  TestValidator.predicate(
    "records >= 0",
    defaultSearch.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", defaultSearch.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.equals(
    "data is array",
    Array.isArray(defaultSearch.data),
    true,
  );
  // Validate each moderation log entry
  for (const log of defaultSearch.data) {
    typia.assert(log);
    // Validate business logic - ensure required fields exist (typia.assert already validated types)
    TestValidator.predicate("log has non-empty id", log.id.length > 0);
    TestValidator.predicate(
      "log has non-empty action_type",
      log.action_type.length > 0,
    );
    TestValidator.predicate(
      "log has non-empty target_content_type",
      log.target_content_type.length > 0,
    );
    TestValidator.predicate(
      "log has non-empty target_content_id",
      log.target_content_id.length > 0,
    );
    TestValidator.predicate(
      "log has non-empty created_at",
      log.created_at.length > 0,
    );
    // Validate admin structure
    TestValidator.equals("log has admin", typeof log.admin, "object");
    TestValidator.predicate("admin has non-empty id", log.admin.id.length > 0);
    TestValidator.predicate(
      "admin has non-empty email",
      log.admin.email.length > 0,
    );
    TestValidator.predicate(
      "admin has non-empty display_name",
      log.admin.display_name.length > 0,
    );
    TestValidator.predicate(
      "admin has non-empty created_at",
      log.admin.created_at.length > 0,
    );
  }
  // Test 2: Search with specific action type filter
  if (defaultSearch.data.length > 0) {
    const sampleActionType = defaultSearch.data[0].action_type;
    const filteredSearch =
      await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
        superAdminConnection,
        {
          body: {
            action_type: sampleActionType,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardContentModerationLog.IRequest,
        },
      );
    typia.assert(filteredSearch);
    // Validate that all returned logs match the filter
    for (const log of filteredSearch.data) {
      TestValidator.equals(
        "action type matches filter",
        log.action_type,
        sampleActionType,
      );
    }
  }
  // Test 3: Search with specific target content type filter
  if (defaultSearch.data.length > 0) {
    const sampleContentType = defaultSearch.data[0].target_content_type;
    const contentTypeSearch =
      await api.functional.discussionBoard.superAdmin.content_moderation_logs.index(
        superAdminConnection,
        {
          body: {
            target_content_type: sampleContentType,
            page: 1,
            limit: 5,
          } satisfies IDiscussionBoardContentModerationLog.IRequest,
        },
      );
    typia.assert(contentTypeSearch);
    // Validate that all returned logs match the filter
    for (const log of contentTypeSearch.data) {
      TestValidator.equals(
        "target content type matches filter",
        log.target_content_type,
        sampleContentType,
      );
    }
  }
  // Test 4: Verify chronological order (newest first)
  if (defaultSearch.data.length > 1) {
    for (let i = 1; i < defaultSearch.data.length; i++) {
      const currentLog = new Date(defaultSearch.data[i].created_at);
      const previousLog = new Date(defaultSearch.data[i - 1].created_at);
      TestValidator.predicate(
        "logs are in descending chronological order",
        currentLog <= previousLog,
      );
    }
  }
}
