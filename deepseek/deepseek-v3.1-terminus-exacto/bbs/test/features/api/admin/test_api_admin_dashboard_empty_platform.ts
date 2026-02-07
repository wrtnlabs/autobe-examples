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
 * Test the dashboard's behavior when the platform has minimal or no activity.
 * Verify that the dashboard correctly handles scenarios with zero users, no articles,
 * no comments, and no sections. Ensure that the response structure remains consistent
 * even with zero counts across all metrics and that pagination metadata reflects the
 * empty state correctly.
 */
export async function test_api_admin_dashboard_empty_platform(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
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
  // Call dashboard endpoint with empty request body
  const dashboardResponse =
    await api.functional.discussionBoard.admin.administrators.dashboard.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(dashboardResponse);
  // Validate pagination structure exists and is consistent
  TestValidator.predicate(
    "pagination structure exists",
    dashboardResponse.pagination !== undefined &&
      typeof dashboardResponse.pagination.current === "number" &&
      typeof dashboardResponse.pagination.limit === "number" &&
      typeof dashboardResponse.pagination.records === "number" &&
      typeof dashboardResponse.pagination.pages === "number",
  );
  // Validate data array is empty for empty platform
  TestValidator.equals("empty data array", dashboardResponse.data.length, 0);
  // Validate each item in data array has the expected structure
  for (const item of dashboardResponse.data) {
    typia.assert<IDiscussionBoardAdministratorPromotionApproval.ISummary>(item);
    TestValidator.predicate(
      "item has valid UUID",
      typeof item.id === "string" && item.id.length > 0,
    );
  }
}
