import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModeratedContentHistory";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardModeratedContentHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModeratedContentHistory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_moderated_content_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Test basic pagination with default parameters
  const defaultPage =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(defaultPage);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "has pagination structure",
    defaultPage.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(defaultPage.data));
  // Test different page and limit combinations
  const testCases = [
    { page: 1, limit: 5 },
    { page: 2, limit: 10 },
    { page: 1, limit: 20 },
  ];
  for (const testCase of testCases) {
    const result =
      await api.functional.discussionBoard.admin.moderated_content_histories.index(
        adminConnection,
        {
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
        },
      );
    typia.assert(result);
    // Validate pagination metadata - access the nested pagination structure correctly
    const { pagination } = result;
    const actualPagination = pagination.pagination;
    TestValidator.equals(
      `page ${testCase.page} current page`,
      actualPagination.current,
      testCase.page,
    );
    TestValidator.equals(
      `page ${testCase.page} limit`,
      actualPagination.limit,
      testCase.limit,
    );
    TestValidator.predicate(
      `page ${testCase.page} records non-negative`,
      actualPagination.records >= 0,
    );
    TestValidator.predicate(
      `page ${testCase.page} pages non-negative`,
      actualPagination.pages >= 0,
    );
    // Validate data count does not exceed limit
    TestValidator.predicate(
      `page ${testCase.page} data count <= limit`,
      result.data.length <= testCase.limit,
    );
  }
  // Test that requesting page beyond total pages returns empty or handles gracefully
  const largePageResult =
    await api.functional.discussionBoard.admin.moderated_content_histories.index(
      adminConnection,
      {
        body: {
          page: 99999,
          limit: 10,
        } satisfies IDiscussionBoardModeratedContentHistory.IRequest,
      },
    );
  typia.assert(largePageResult);
  // Validate that data array is present even for out-of-bounds pages
  TestValidator.predicate(
    "large page has data array",
    Array.isArray(largePageResult.data),
  );
}
