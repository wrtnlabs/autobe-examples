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

export async function test_api_audit_log_search_no_filters(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using join
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Query audit logs with no filters - empty request body
  const emptyRequest: IDiscussionBoardAuditLog.IRequest = {};
  const response =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: emptyRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure - navigate through nested pagination types
  TestValidator.predicate(
    "has pagination metadata",
    response.pagination !== undefined,
  );
  TestValidator.predicate(
    "has nested pagination structure",
    response.pagination.pagination !== undefined,
  );
  TestValidator.predicate(
    "has deep nested pagination structure",
    response.pagination.pagination.pagination !== undefined,
  );
  TestValidator.predicate(
    "has final pagination structure",
    response.pagination.pagination.pagination.pagination !== undefined,
  );
  // Access the actual pagination properties through the nested structure
  const actualPagination = response.pagination.pagination.pagination.pagination;
  TestValidator.equals(
    "pagination has current page",
    typeof actualPagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination has limit",
    typeof actualPagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof actualPagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof actualPagination.pages,
    "number",
  );
  // Validate data structure
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // Validate pagination metadata values
  TestValidator.predicate(
    "current page is non-negative",
    actualPagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", actualPagination.limit >= 0);
  TestValidator.predicate(
    "records is non-negative",
    actualPagination.records >= 0,
  );
  TestValidator.predicate("pages is non-negative", actualPagination.pages >= 0);
  // Validate pagination calculation integrity
  if (actualPagination.limit > 0) {
    const calculatedPages = Math.ceil(
      actualPagination.records / actualPagination.limit,
    );
    TestValidator.equals(
      "pages calculation matches",
      actualPagination.pages,
      calculatedPages,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when limit is 0",
      actualPagination.pages,
      0,
    );
  }
  // Validate that current page is within bounds
  TestValidator.predicate(
    "current page within page bounds",
    actualPagination.pages === 0 ||
      actualPagination.current <= actualPagination.pages,
  );
}
