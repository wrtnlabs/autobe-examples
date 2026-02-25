import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_audit_log_search_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Test negative page number (should default to page 1)
  const negativePageResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: -1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(negativePageResult);
  TestValidator.predicate(
    "negative page defaults to page 1",
    negativePageResult.pagination.pagination.pagination.pagination.current ===
      1,
  );
  // Test page 0 (should default to page 1)
  const zeroPageResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 0,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(zeroPageResult);
  TestValidator.predicate(
    "page 0 defaults to page 1",
    zeroPageResult.pagination.pagination.pagination.pagination.current === 1,
  );
  // Test minimum page size (1 record)
  const minPageSizeResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 1,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(minPageSizeResult);
  TestValidator.predicate(
    "minimum page size handled",
    minPageSizeResult.pagination.pagination.pagination.pagination.limit === 1,
  );
  // Test maximum page size (100 records)
  const maxPageSizeResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(maxPageSizeResult);
  TestValidator.predicate(
    "maximum page size handled",
    maxPageSizeResult.pagination.pagination.pagination.pagination.limit === 100,
  );
  // Test very large page number (should return empty results)
  const largePageResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 999999,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(largePageResult);
  TestValidator.predicate(
    "very large page returns empty data",
    largePageResult.data.length === 0,
  );
  // Test pagination metadata consistency
  const baselineResult =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(baselineResult);
  // Validate basic pagination metadata
  TestValidator.predicate(
    "current page positive",
    baselineResult.pagination.pagination.pagination.pagination.current > 0,
  );
  TestValidator.predicate(
    "limit within bounds",
    baselineResult.pagination.pagination.pagination.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records non-negative",
    baselineResult.pagination.pagination.pagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    baselineResult.pagination.pagination.pagination.pagination.pages >= 0,
  );
  // Test last page scenario if there are multiple pages
  if (baselineResult.pagination.pagination.pagination.pagination.pages > 1) {
    const lastPageResult =
      await api.functional.discussionBoard.superAdmin.audit_logs.index(
        superAdminConnection,
        {
          body: {
            page: baselineResult.pagination.pagination.pagination.pagination
              .pages,
            limit: 20,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(lastPageResult);
    TestValidator.predicate(
      "last page current matches requested",
      lastPageResult.pagination.pagination.pagination.pagination.current ===
        baselineResult.pagination.pagination.pagination.pagination.pages,
    );
    TestValidator.predicate(
      "last page data length reasonable",
      lastPageResult.data.length <=
        baselineResult.pagination.pagination.pagination.pagination.limit,
    );
  }
}
