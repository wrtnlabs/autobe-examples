import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequestDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestDashboard";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the administrator promotion request dashboard returns all zero counts when no promotion requests have been submitted.
 *
 * Validates the dashboard endpoint correctly handles the empty state scenario where no promotion requests exist in the system. The test ensures all count fields are present and return zero values.
 *
 * The test authenticates as a super administrator and queries the dashboard immediately after registration, guaranteeing no promotion requests have been created. This validates the baseline empty state behavior.
 *
 * 1. Super administrator registers and authenticates via join operation.
 * 2. Dashboard endpoint is called with fresh system state (no requests).
 * 3. Response structure is validated with typia.assert().
 * 4. All four count fields (total, pending, approved, rejected) are verified to equal 0.
 */
export async function test_api_admin_promotion_request_dashboard_empty_state(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Call dashboard endpoint (no promotion requests exist)
  const dashboard =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.dashboard(
      superAdminConnection,
    );
  typia.assert(dashboard);
  // 3. Validate all counts are zero
  TestValidator.equals("total count", dashboard.total, 0);
  TestValidator.equals("pending count", dashboard.pending, 0);
  TestValidator.equals("approved count", dashboard.approved, 0);
  TestValidator.equals("rejected count", dashboard.rejected, 0);
}
