import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestDashboard";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the administrator promotion request dashboard returns accurate aggregated counts when promotion requests exist in various states.
 *
 * Validates the complete promotion request workflow including super administrator authentication, multiple member and seller account creation, promotion request submissions from different actor types, and dashboard statistics verification. Ensures that the dashboard correctly aggregates counts across both member and seller promotion requests.
 *
 * Special attention is given to verifying that the total count represents the sum of all requests regardless of actor type, the pending count accurately reflects requests awaiting super administrator review, and that approved and rejected counts are zero when no review actions have been taken.
 *
 * 1. Super administrator registers and authenticates via join operation.
 * 2. First member account is created and submits an administrator promotion request.
 * 3. Second member account is created and submits another promotion request.
 * 4. Seller account is created and submits a third promotion request.
 * 5. Super administrator accesses the dashboard endpoint.
 * 6. Validates that total count equals 3 (all submitted requests).
 * 7. Validates that pending count equals 3 (all requests awaiting review).
 * 8. Validates that approved and rejected counts equal 0.
 */
export async function test_api_admin_promotion_request_dashboard_summary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. First member account and promotion request
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {});
  const request1 =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      member1Connection,
      {},
    );
  typia.assert(request1);
  // 3. Second member account and promotion request
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {});
  const request2 =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      member2Connection,
      {},
    );
  typia.assert(request2);
  // 4. Seller account and promotion request
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const request3 =
    await generate_random_shopping_mall_seller_admin_promotion_requests_create(
      sellerConnection,
      {},
    );
  typia.assert(request3);
  // 5. Access dashboard as super administrator
  const dashboard =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.dashboard(
      superAdminConnection,
    );
  typia.assert(dashboard);
  // 6-9. Validate dashboard counts
  TestValidator.equals("total count", dashboard.total, 3);
  TestValidator.equals("pending count", dashboard.pending, 3);
  TestValidator.equals("approved count", dashboard.approved, 0);
  TestValidator.equals("rejected count", dashboard.rejected, 0);
}
