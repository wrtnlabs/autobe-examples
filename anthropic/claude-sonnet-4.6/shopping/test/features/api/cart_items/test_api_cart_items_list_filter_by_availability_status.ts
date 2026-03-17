import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
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
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_seller_approvals_create } from "../../../generate/generate_random_shopping_mall_seller_approvals_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_records_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_seller_approval } from "../../../prepare/prepare_random_shopping_mall_seller_approval";

export async function test_api_cart_items_list_filter_by_availability_status(
  connection: api.IConnection,
): Promise<void> {
  // ----------------------------------------------------------------
  // 1. Register customer
  // ----------------------------------------------------------------
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      nickname: RandomGenerator.name(1),
      phone: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ----------------------------------------------------------------
  // 2. Register seller
  // ----------------------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // ----------------------------------------------------------------
  // 3. Seller submits approval request
  // ----------------------------------------------------------------
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // ----------------------------------------------------------------
  // 4. Register admin
  // ----------------------------------------------------------------
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  // ----------------------------------------------------------------
  // 5. Admin approves the seller
  // ----------------------------------------------------------------
  const approvedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        },
      },
    );
  typia.assert(approvedApproval);
  // ----------------------------------------------------------------
  // 6. Seller creates a product
  // ----------------------------------------------------------------
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  // ----------------------------------------------------------------
  // 7. Seller creates variantA (will receive inventory → available)
  // ----------------------------------------------------------------
  const variantA =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variantA);
  // ----------------------------------------------------------------
  // 8. Seller creates variantB (no inventory → out_of_stock, not added to cart)
  // ----------------------------------------------------------------
  const variantB =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {},
      },
    );
  typia.assert(variantB);
  // ----------------------------------------------------------------
  // 9. Seller adds inventory only for variantA
  // ----------------------------------------------------------------
  const inventoryRecord =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variantA.id },
        body: { quantity: 100, note: "Initial stock for variantA" },
      },
    );
  typia.assert(inventoryRecord);
  // ----------------------------------------------------------------
  // 10. Customer adds variantA to cart (should be 'available')
  // ----------------------------------------------------------------
  const cartItemA =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantA.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItemA);
  // ----------------------------------------------------------------
  // Primary filter test: availabilityStatus = 'available'
  // ----------------------------------------------------------------
  const availableResult =
    await api.functional.shoppingMall.customer.cartItems.index(
      customerConnection,
      {
        body: {
          availabilityStatus: "available",
        },
      },
    );
  typia.assert(availableResult);
  // All items must have availability_status === 'available'
  TestValidator.predicate(
    "all filtered items have availability_status 'available'",
    availableResult.data.every(
      (item) => item.availability_status === "available",
    ),
  );
  // pagination.records reflects only the count of available items
  TestValidator.equals(
    "available filter pagination records matches data length",
    availableResult.pagination.records,
    availableResult.data.length,
  );
  // At least 1 available item in cart (variantA)
  TestValidator.predicate(
    "at least one available cart item returned",
    availableResult.data.length >= 1,
  );
  // variantA should appear in available filtered results
  TestValidator.predicate(
    "variantA appears in available filtered cart items",
    availableResult.data.some((item) => item.variant.id === variantA.id),
  );
  // ----------------------------------------------------------------
  // Secondary filter test: availabilityStatus = 'out_of_stock'
  // ----------------------------------------------------------------
  const outOfStockResult =
    await api.functional.shoppingMall.customer.cartItems.index(
      customerConnection,
      {
        body: {
          availabilityStatus: "out_of_stock",
        },
      },
    );
  typia.assert(outOfStockResult);
  // Should be empty since no out_of_stock items are in this customer's cart
  TestValidator.equals(
    "out_of_stock filter returns empty data array",
    outOfStockResult.data.length,
    0,
  );
  TestValidator.equals(
    "out_of_stock filter pagination records is 0",
    outOfStockResult.pagination.records,
    0,
  );
  // ----------------------------------------------------------------
  // Unfiltered listing comparison
  // ----------------------------------------------------------------
  const unfilteredResult =
    await api.functional.shoppingMall.customer.cartItems.index(
      customerConnection,
      {
        body: {},
      },
    );
  typia.assert(unfilteredResult);
  // Unfiltered should contain at least 1 item
  TestValidator.predicate(
    "unfiltered result contains all cart items",
    unfilteredResult.data.length >= 1,
  );
  // Unfiltered record count >= available filtered count
  TestValidator.predicate(
    "unfiltered record count >= available filtered count",
    unfilteredResult.pagination.records >= availableResult.pagination.records,
  );
  // variantA should appear in unfiltered results
  TestValidator.predicate(
    "variantA appears in unfiltered cart items",
    unfilteredResult.data.some((item) => item.variant.id === variantA.id),
  );
}
