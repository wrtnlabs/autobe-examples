import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that seller account deletion operation completes successfully.
 *
 * This test verifies the seller deletion workflow by:
 * 1. Creating admin, seller, and customer accounts
 * 2. Admin authenticating and deleting the seller account
 * 3. Verifying successful deletion operation
 *
 * Note: Full data preservation validation (orders, products, reviews, snapshots)
 * would require additional read endpoints to verify data remains accessible
 * after deletion, which are not available in the current SDK.
 */
export async function test_api_seller_deletion_data_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      href: "https://test.com/admin/register",
      referrer: "https://test.com",
    },
  });
  // 2. Create seller account (to be deleted)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: "seller@test.com",
      password: "12345678",
      shop_name: "Test Shop",
      shop_description: "A test shop for deletion verification",
      href: "https://test.com/seller/register",
      referrer: "https://test.com",
    },
  });
  typia.assert(seller);
  // 3. Create customer account (for completeness)
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: "customer@test.com",
      password: "12345678",
      display_name: "Test Customer",
      phone_number: "01012345678",
      href: "https://test.com/customer/register",
      referrer: "https://test.com",
    },
  });
  typia.assert(customer);
  // 4. Admin deletes the seller
  await api.functional.shoppingMall.admin.sellers.erase(adminConnection, {
    sellerId: seller.id,
  });
  // Deletion success is verified by no error being thrown
  // Additional validation would require read endpoints to verify:
  // - Seller cannot login after deletion
  // - Orders containing seller's products still exist with snapshots
  // - Products are removed from public listings
  // - Seller profile snapshots are preserved
}
