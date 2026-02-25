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

/**
 * Test pagination edge cases and boundary conditions for ban reason categories.
 * 1. Authenticate as super administrator
 * 2. Test page 1 with limit 10 (normal case)
 * 3. Test page 1 with small limit 5
 * 4. Test maximum limit value 100
 * 5. Test page beyond total records (should return empty data)
 * 6. Test zero results scenario with non-existent search term
 */
export async function test_api_ban_reason_categories_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(admin);
  // 2. Test normal case: page 1 with limit 10
  const normalCase =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(normalCase);
  TestValidator.predicate(
    "normal case has valid pagination",
    normalCase.pagination.pagination.pagination.pagination.current === 1 &&
      normalCase.pagination.pagination.pagination.pagination.limit === 10 &&
      normalCase.pagination.pagination.pagination.pagination.records >= 0 &&
      normalCase.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // 3. Test small limit: page 1 with limit 5
  const smallLimit =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(smallLimit);
  TestValidator.equals(
    "small limit has correct limit",
    smallLimit.pagination.pagination.pagination.pagination.limit,
    5,
  );
  // 4. Test maximum limit value 100
  const maxLimit =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(maxLimit);
  TestValidator.equals(
    "max limit is 100",
    maxLimit.pagination.pagination.pagination.pagination.limit,
    100,
  );
  // 5. Test page beyond total records - should return empty data array
  const totalPages = maxLimit.pagination.pagination.pagination.pagination.pages;
  if (totalPages > 0) {
    const beyondPage =
      await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
        superAdminConnection,
        {
          body: {
            page: totalPages + 1,
            limit: 10,
          } satisfies IDiscussionBoardBanReasonCategory.IRequest,
        },
      );
    typia.assert(beyondPage);
    TestValidator.equals(
      "beyond page has empty data",
      beyondPage.data.length,
      0,
    );
    TestValidator.equals(
      "beyond page has correct current page",
      beyondPage.pagination.pagination.pagination.pagination.current,
      totalPages + 1,
    );
  }
  // 6. Test zero results scenario with non-existent search term
  const zeroResults =
    await api.functional.discussionBoard.superAdmin.ban_reason_categories.index(
      superAdminConnection,
      {
        body: {
          search: RandomGenerator.alphabets(100) + "_nonexistent",
        } satisfies IDiscussionBoardBanReasonCategory.IRequest,
      },
    );
  typia.assert(zeroResults);
  TestValidator.equals(
    "zero results has empty data",
    zeroResults.data.length,
    0,
  );
  TestValidator.predicate(
    "zero results has valid pagination metadata",
    zeroResults.pagination.pagination.pagination.pagination.pages >= 0 &&
      zeroResults.pagination.pagination.pagination.pagination.records >= 0,
  );
}
