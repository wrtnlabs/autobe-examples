import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerDashboard";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test seller dashboard statistics aggregation with product creation.
 *
 * Validates that an approved seller can view their dashboard with correct aggregated statistics.
 * The dashboard should show accurate counts for total products, order items, pending cancellation
 * requests, and pending refund requests.
 *
 * 1. Register a new seller account with email and password credentials.
 * 2. Register and login as administrator.
 * 3. Admin approves the pending seller registration.
 * 4. Login as the approved seller.
 * 5. Create multiple products using the product generation utility.
 * 6. Retrieve the seller dashboard via GET /seller/sellers/me/dashboard.
 * 7. Validate totalProducts count matches the number of created products.
 * 8. Validate other dashboard metrics are initialized correctly (order items, pending requests).
 *
 * Note: Full order-related testing (cancellation requests, refund requests) requires additional
 * customer, cart, and order endpoints that are not available in the current SDK.
 */
export async function test_api_seller_dashboard_with_products_and_orders(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16) + "!Aa1";
  const sellerConnectionForJoin: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnectionForJoin, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000/seller/join",
      referrer: "http://localhost:3000/",
    },
  });
  typia.assert(seller);
  // 2. Register and login as admin to approve the seller
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16) + "!Aa1";
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/",
    },
  });
  // 3. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.admin.sellers.approve(
      adminConnection,
      { sellerId: seller.id },
    );
  typia.assert(approvedSeller);
  // 4. Login as the approved seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "http://localhost:3000/seller/login",
      referrer: "http://localhost:3000/",
    },
  });
  // 5. Create multiple products
  const productCount = 3;
  const products = await ArrayUtil.asyncRepeat(productCount, async () =>
    generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      { body: prepare_random_ecommerce_mall_product() },
    ),
  );
  for (const product of products) {
    typia.assert(product);
  }
  // 6. Retrieve the seller dashboard
  const dashboard =
    await api.functional.ecommerceMall.seller.sellers.me.dashboard.at(
      sellerConnection,
    );
  typia.assert(dashboard);
  // 7. Validate totalProducts count matches created products
  TestValidator.equals(
    "totalProducts matches created products",
    dashboard.totalProducts,
    productCount,
  );
  // 8. Validate other dashboard metrics are correctly initialized
  TestValidator.equals(
    "totalOrderItems initially zero",
    dashboard.totalOrderItems,
    0,
  );
  TestValidator.equals(
    "pendingCancellationRequests initially zero",
    dashboard.pendingCancellationRequests,
    0,
  );
  TestValidator.equals(
    "pendingRefundRequests initially zero",
    dashboard.pendingRefundRequests,
    0,
  );
}