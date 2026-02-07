import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderation_action_types_analytics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Register admin account using utility function
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test pagination with default parameters
  const defaultPage =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals(
    "default page should be 1",
    defaultPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be positive",
    defaultPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultPage.pagination.pages >= 0,
  );
  // Test specific page request
  const page2 =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: 2,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals(
    "requested page should be 2",
    page2.pagination.current,
    2,
  );
  // Test small limit value
  const smallLimit =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          limit: 5,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(smallLimit);
  TestValidator.equals("limit should be 5", smallLimit.pagination.limit, 5);
  TestValidator.predicate(
    "data length should not exceed limit",
    smallLimit.data.length <= 5,
  );
  // Test large page number (beyond available range)
  const largePage =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: 999,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(largePage);
  TestValidator.equals(
    "current page should match request",
    largePage.pagination.current,
    999,
  );
  TestValidator.predicate(
    "data should be empty for non-existent page",
    largePage.data.length === 0,
  );
  // Test pagination metadata consistency
  TestValidator.predicate(
    "pages calculation should be consistent",
    largePage.pagination.pages ===
      Math.ceil(largePage.pagination.records / largePage.pagination.limit),
  );
  // Test combination of page and limit
  const combined =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          page: 3,
          limit: 10,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(combined);
  TestValidator.equals("page should be 3", combined.pagination.current, 3);
  TestValidator.equals("limit should be 10", combined.pagination.limit, 10);
  // Test edge case: limit = 1
  const limit1 =
    await api.functional.discussionBoard.admin.analytics.moderation_action_types.index(
      adminConnection,
      {
        body: {
          limit: 1,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(limit1);
  TestValidator.equals("limit should be 1", limit1.pagination.limit, 1);
  TestValidator.predicate(
    "data length should be 0 or 1",
    limit1.data.length <= 1,
  );
  // Test pagination formula across all results
  TestValidator.predicate(
    "pagination formula should hold for default page",
    defaultPage.pagination.pages ===
      Math.ceil(defaultPage.pagination.records / defaultPage.pagination.limit),
  );
  TestValidator.predicate(
    "pagination formula should hold for small limit",
    smallLimit.pagination.pages ===
      Math.ceil(smallLimit.pagination.records / smallLimit.pagination.limit),
  );
}
