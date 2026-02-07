import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test the dashboard's basic functionality since date range filtering is not currently supported.
 * The IDiscussionBoardAdministratorPromotionApproval.IRequest type is empty {}, so we test the
 * dashboard's ability to return paginated statistics without date filtering capabilities.
 */
export async function test_api_admin_dashboard_date_range_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test dashboard endpoint with empty request body (current API limitation)
  const dashboardStats =
    await api.functional.discussionBoard.admin.administrators.dashboard.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(dashboardStats);
  // Validate response structure matches IPageIDiscussionBoardAdministratorPromotionApproval.ISummary
  TestValidator.equals(
    "dashboard response has pagination",
    typeof dashboardStats.pagination,
    "object",
  );
  TestValidator.equals(
    "dashboard response has data array",
    Array.isArray(dashboardStats.data),
    true,
  );
  // Validate pagination properties exist and have correct types
  TestValidator.predicate(
    "pagination has current property",
    "current" in dashboardStats.pagination,
  );
  TestValidator.predicate(
    "pagination has limit property",
    "limit" in dashboardStats.pagination,
  );
  TestValidator.predicate(
    "pagination has records property",
    "records" in dashboardStats.pagination,
  );
  TestValidator.predicate(
    "pagination has pages property",
    "pages" in dashboardStats.pagination,
  );
  // Validate pagination values are non-negative integers
  TestValidator.predicate(
    "current page is non-negative",
    dashboardStats.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    dashboardStats.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    dashboardStats.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    dashboardStats.pagination.pages >= 0,
  );
  // Validate data items have required UUID id property
  if (dashboardStats.data.length > 0) {
    const sampleItem = dashboardStats.data[0];
    TestValidator.predicate("data item has id property", "id" in sampleItem);
    TestValidator.equals("id is string type", typeof sampleItem.id, "string");
    // Note: Cannot validate UUID format without regex pattern matching
    // as typia.assert already validates the complete structure
  }
}
