import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanReasonCategory";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ban_reason_categories_search_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // Update connection headers with authentication token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: superAdmin.token.access,
  };
  // Test 1: Search by partial category name
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "pagination structure present",
    searchResult1.pagination !== undefined && searchResult1.data !== undefined,
  );
  // Test 2: Filter by active status only
  const searchResult2 =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Filter by inactive status only
  const searchResult3 =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          is_active: false,
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Combine text search with status filter
  const searchResult4 =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          search: "category",
          is_active: true,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Test 5: Boundary conditions - empty search string
  const searchResult5 =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          search: "",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Test 6: Boundary conditions - undefined status (instead of null)
  const searchResult6 =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          is_active: undefined,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(searchResult6);
  // Verify data structure
  if (searchResult1.data.length > 0) {
    const category = searchResult1.data[0];
    TestValidator.predicate(
      "category has required fields",
      typeof category.id === "string" &&
        typeof category.name === "string" &&
        typeof category.is_active === "boolean" &&
        typeof category.sort_order === "number",
    );
  }
}
