import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductInventoryHistory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_customer_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_customer_order_items_cancellation_request_create";
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_inventory_history } from "../../../prepare/prepare_random_shopping_mall_product_inventory_history";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test that the seller dashboard correctly displays pending cancellation counts.
 *
 * This test validates the dashboard metric that shows the number of pending
 * cancellation requests requiring the seller's attention. The workflow involves:
 * 1. Admin creates and approves a seller account
 * 2. Seller creates a product with variant and inventory
 * 3. Customer registers, places an order, and submits a cancellation request
 * 4. Seller accesses dashboard and verifies pendingCancellations equals 1
 */
export async function test_api_seller_dashboard_pending_cancellations(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Step 2: Create seller account with known credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(sellerAuth);
  // Step 3: Admin approves the seller
  const approvedSeller =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerAuth.id,
    });
  typia.assert(approvedSeller);
  TestValidator.equals(
    "seller approval status",
    approvedSeller.approvalStatus,
    "approved",
  );
  // Step 4: Seller logs in to get proper authenticated session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://test.example.com/seller/login",
      referrer: "https://test.example.com",
    },
  });
  // Step 5: Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {},
  );
  typia.assert(product);
  // Step 6: Seller creates a variant for the product with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${Date.now()}`,
          optionValues: [{ key: "color", value: "Red" }],
          stockQuantity: 100,
        },
      },
    );
  typia.assert(variant);
  // Step 7: Seller adds additional inventory to the variant
  const inventory =
    await generate_random_shopping_mall_seller_sellers_me_variants_inventory_add_add_inventory(
      sellerLoginConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 50,
          reason: "Additional stock for test",
        },
      },
    );
  typia.assert(inventory);
  // Step 8: Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // Step 9: Customer creates an order
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {},
  );
  typia.assert(order);
  // Step 10: Customer submits cancellation request for the first order item
  const orderItem = order.orderItems[0];
  const cancellationRequest =
    await generate_random_shopping_mall_customer_order_items_cancellation_request_create(
      customerConnection,
      {
        params: { orderItemId: orderItem.id },
        body: {
          reason: "Customer requested cancellation for testing",
        },
      },
    );
  typia.assert(cancellationRequest);
  TestValidator.equals(
    "cancellation request status",
    cancellationRequest.status,
    "pending",
  );
  // Step 11: Seller checks dashboard for pending cancellations
  const dashboard =
    await api.functional.shoppingMall.seller.sellers.me.dashboard(
      sellerLoginConnection,
    );
  typia.assert(dashboard);
  // Step 12: Verify pending cancellations count reflects the pending request
  TestValidator.equals(
    "pending cancellations count",
    dashboard.pendingCancellations,
    1,
  );
  TestValidator.predicate(
    "product count positive",
    dashboard.productCount >= 1,
  );
  TestValidator.predicate(
    "order item count positive",
    dashboard.orderItemCount >= 1,
  );
}