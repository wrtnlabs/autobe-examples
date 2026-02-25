import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_sections_pagination_settings(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator and get authorized connection
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Update connection with authorization token
  superAdminConnection.headers = {
    Authorization: authResult.token.access,
  };
  // Test pagination with different configurations
  const paginationTests = [
    { page: 1, limit: 10 },
    { page: 2, limit: 20 },
    { page: 1, limit: 50 },
    { page: 3, limit: 5 },
  ] as const;
  for (const testConfig of paginationTests) {
    const browseResult =
      await api.functional.discussionBoard.superAdmin.browse.index(
        superAdminConnection,
        {
          body: {
            page: testConfig.page,
            limit: testConfig.limit,
          } satisfies IDiscussionBoardSection.IRequest,
        },
      );
    typia.assert(browseResult);
    // Validate pagination metadata - using correct deeply nested property names
    const actualPagination =
      browseResult.pagination.pagination.pagination.pagination;
    TestValidator.equals(
      `page ${testConfig.page} current page matches request`,
      actualPagination.current,
      testConfig.page,
    );
    TestValidator.equals(
      `page ${testConfig.page} limit matches request`,
      actualPagination.limit,
      testConfig.limit,
    );
    TestValidator.predicate(
      `page ${testConfig.page} records count is non-negative`,
      actualPagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${testConfig.page} pages count is non-negative`,
      actualPagination.pages >= 0,
    );
    // Validate data array size matches limit (except possibly last page)
    if (actualPagination.current < actualPagination.pages) {
      TestValidator.equals(
        `page ${testConfig.page} data size matches limit`,
        browseResult.data.length,
        testConfig.limit,
      );
    } else {
      // Last page can have fewer items
      TestValidator.predicate(
        `page ${testConfig.page} data size is valid for last page`,
        browseResult.data.length <= testConfig.limit,
      );
    }
    // Validate pagination calculations with safe division
    if (testConfig.limit > 0) {
      const expectedPages = Math.ceil(
        actualPagination.records / testConfig.limit,
      );
      TestValidator.equals(
        `page ${testConfig.page} pages calculation is correct`,
        actualPagination.pages,
        expectedPages,
      );
    } else {
      // Handle zero limit case (should not happen due to validation)
      TestValidator.equals(
        `page ${testConfig.page} pages is 0 when limit is 0`,
        actualPagination.pages,
        0,
      );
    }
  }
}
