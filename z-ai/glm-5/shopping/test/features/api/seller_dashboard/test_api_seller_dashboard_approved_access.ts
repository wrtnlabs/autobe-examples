import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboard";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_dashboard_approved_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for approving sellers
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);
  // 2. Create seller account (status will be 'pending')
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: seller.id,
    });
  typia.assert(approvedSeller);
  // 4. Seller logs in with approved status to get fresh token
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: sellerPassword,
      href: typia.random<string>(),
      referrer: typia.random<string>(),
    },
  });
  // 5. Approved seller accesses dashboard
  const dashboard =
    await api.functional.shoppingMall.seller.sellers.me.dashboard(
      sellerLoginConnection,
    );
  typia.assert(dashboard);
  // 6. Validate dashboard metrics for newly approved seller (all should be 0)
  TestValidator.equals("product count is 0", dashboard.productCount, 0);
  TestValidator.equals("order item count is 0", dashboard.orderItemCount, 0);
  TestValidator.equals(
    "pending cancellations is 0",
    dashboard.pendingCancellations,
    0,
  );
  TestValidator.equals("pending refunds is 0", dashboard.pendingRefunds, 0);
}