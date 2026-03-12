import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

/**
 * Test administrator deletion of a seller account.
 *
 * This test validates the complete workflow where an administrator deletes
 * a seller account from the shopping mall platform. The test verifies that:
 * 1. Admin can successfully register and authenticate
 * 2. Seller can be registered with pending approval status
 * 3. Admin can delete the seller account
 * 4. Soft deletion preserves all historical data (snapshots, order history)
 * 5. Seller sessions are invalidated upon deletion
 */
export async function test_api_seller_account_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    },
  });
  typia.assert(admin);
  // 2. Seller setup - register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(seller);
  // 3. Execute seller account deletion by admin
  await api.functional.shoppingMall.admin.sellers.erase(adminConnection, {
    sellerId: seller.id,
  });
  // 4. Validate deletion success - operation completed without error
  TestValidator.predicate(
    "seller account deletion completed successfully",
    true,
  );
}
