import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallOrderItemSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotOption";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_member_cart_items_create } from "../../../generate/generate_random_shopping_mall_member_cart_items_create";
import { generate_random_shopping_mall_member_orders_create } from "../../../generate/generate_random_shopping_mall_member_orders_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test administrator access to order item snapshot after product deletion.
 *
 * Validates that order item snapshots remain accessible and contain accurate historical data even after the original product has been deleted from the platform. This ensures order history integrity and dispute resolution capability are maintained independent of product lifecycle.
 *
 * The test verifies the complete workflow: admin and seller setup, product creation with variants, customer order placement (which auto-creates snapshots), product deletion, and finally snapshot retrieval by admin.
 *
 * 1. Administrator account created and authenticated.
 * 2. Seller account created, approval request submitted, and approved by admin.
 * 3. Approved seller creates a product with variants.
 * 4. Customer account created and authenticated.
 * 5. Customer adds product variant to cart and places order.
 * 6. Order placement auto-creates order item snapshots capturing purchase-time state.
 * 7. Admin deletes the original product from platform.
 * 8. Admin retrieves order item snapshot using snapshot ID from order.
 * 9. Validates snapshot contains all historical data: product_name, product_description, variant_price, seller_shop_name, options.
 */
export async function test_api_order_item_snapshot_deleted_product_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Seller setup - create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 3. Submit seller approval request
  const approvalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      sellerConnection,
    );
  typia.assert(approvalRequest);
  // 4. Admin approves seller registration
  await api.functional.shoppingMall.admin.approval_requests.update(
    adminConnection,
    {
      requestId: approvalRequest.id,
      body: {
        status: "approved",
      } satisfies IShoppingMallSellerApprovalRequest.IUpdate,
    },
  );
  // 5. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 6. Seller creates product variant
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          option_values: "Color: Red, Size: Large",
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 7. Customer setup - create and authenticate customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customerAuth);
  // 8. Customer adds product variant to cart
  const cartItem = await api.functional.shoppingMall.member.cart.items.create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      } satisfies IShoppingMallCartItem.ICreate,
    },
  );
  typia.assert(cartItem);
  // 9. Customer places order (auto-creates order item snapshots)
  const order = await api.functional.shoppingMall.member.orders.create(
    customerConnection,
    {
      body: {
        shopping_mall_customer_address_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 10. Extract snapshot ID from order item
  TestValidator.predicate("order has items", order.orderItems.length > 0);
  const orderItem = order.orderItems[0];
  const snapshotId = orderItem.snapshot.id;
  typia.assert(snapshotId);
  // 11. Admin deletes the original product
  await api.functional.shoppingMall.admin.products.erase(adminConnection, {
    productId: product.id,
  });
  // 12. Admin retrieves order item snapshot (should succeed despite product deletion)
  const snapshot =
    await api.functional.shoppingMall.admin.admin.order_item_snapshots.at(
      adminConnection,
      {
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 13. Validate snapshot contains all historical data
  TestValidator.equals(
    "product name preserved",
    snapshot.product_name,
    product.name,
  );
  TestValidator.equals(
    "product description preserved",
    snapshot.product_description,
    product.description,
  );
  TestValidator.predicate("variant price captured", snapshot.variant_price > 0);
  TestValidator.predicate(
    "seller shop name exists",
    snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "options array preserved",
    snapshot.options.length > 0,
  );
}
