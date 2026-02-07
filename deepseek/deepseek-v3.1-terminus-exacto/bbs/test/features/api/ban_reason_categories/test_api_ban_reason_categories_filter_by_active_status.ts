import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanReasonCategory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanReasonCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_ban_reason_categories_filter_by_active_status(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test filtering for active categories
  const activeCategories =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(activeCategories);
  // Validate that all returned categories are active
  TestValidator.predicate(
    "all active categories should have is_active true",
    activeCategories.data.every((category) => category.is_active === true),
  );
  // Test filtering for inactive categories
  const inactiveCategories =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          is_active: false,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(inactiveCategories);
  // Validate that all returned categories are inactive
  TestValidator.predicate(
    "all inactive categories should have is_active false",
    inactiveCategories.data.every((category) => category.is_active === false),
  );
  // Test without filter (should return all categories)
  const allCategories =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(allCategories);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination should have valid structure",
    allCategories.pagination.current >= 0 &&
      allCategories.pagination.limit > 0 &&
      allCategories.pagination.records >= 0 &&
      allCategories.pagination.pages >= 0,
  );
}
