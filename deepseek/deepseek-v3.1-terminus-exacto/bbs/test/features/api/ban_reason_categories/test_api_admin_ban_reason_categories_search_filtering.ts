import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanReasonCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_ban_reason_categories_search_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "password123",
      display_name: "Test Administrator",
      href: "https://example.com",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test 1: Search with partial name matching
  const searchResult1 =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          name: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Test 2: Filter by active status
  const searchResult2 =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Filter by sort order range
  const searchResult3 =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          sort_order_min: 1,
          sort_order_max: 10,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Combined filters
  const searchResult4 =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          name: "category",
          is_active: false,
          sort_order_min: 5,
          sort_order_max: 15,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Test 5: Pagination validation
  const searchResult5 =
    await api.functional.discussionBoard.admin.ban_reason_categories.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    searchResult5.pagination.current,
    2,
  );
  TestValidator.equals("pagination limit", searchResult5.pagination.limit, 5);
  TestValidator.predicate(
    "total records non-negative",
    searchResult5.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    searchResult5.pagination.pages >= 0,
  );
}
