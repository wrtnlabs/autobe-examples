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

export async function test_api_cart_items_list_with_items(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Register a new admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. Seller submits approval request
  const approval = await generate_random_shopping_mall_seller_approvals_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(approval);
  // 5. Admin approves the seller's approval request
  const updatedApproval =
    await api.functional.shoppingMall.admin.sellerApprovals.update(
      adminConnection,
      {
        approvalId: approval.id,
        body: {
          status: "approved",
          rejection_reason: null,
        } satisfies IShoppingMallSellerApproval.IUpdate,
      },
    );
  typia.assert(updatedApproval);
  // 6. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 7. Seller creates first variant (size:S)
  const variantS =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-S-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              key: "size",
              value: "S",
              sequence: 0,
            },
          ],
        },
      },
    );
  typia.assert(variantS);
  // 8. Seller creates second variant (size:L)
  const variantL =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: `SKU-L-${RandomGenerator.alphaNumeric(8)}`,
          options: [
            {
              key: "size",
              value: "L",
              sequence: 0,
            },
          ],
        },
      },
    );
  typia.assert(variantL);
  // 9. Seller adds inventory for first variant (size:S)
  const inventoryS =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variantS.id },
        body: {
          quantity: 10,
          note: "Initial stock for size S",
        },
      },
    );
  typia.assert(inventoryS);
  // 10. Seller adds inventory for second variant (size:L)
  const inventoryL =
    await generate_random_shopping_mall_seller_products_variants_inventory_records_create(
      sellerConnection,
      {
        params: { productId: product.id, variantId: variantL.id },
        body: {
          quantity: 10,
          note: "Initial stock for size L",
        },
      },
    );
  typia.assert(inventoryL);
  // 11. Customer adds first variant (size:S) to cart with quantity 2
  const cartItemS =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantS.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItemS);
  // 12. Customer adds second variant (size:L) to cart with quantity 3
  const cartItemL =
    await generate_random_shopping_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          product_variant_id: variantL.id,
          quantity: 3,
        },
      },
    );
  typia.assert(cartItemL);
  // Test execution: Get paginated cart item list (no filter, default pagination)
  const cartPage = await api.functional.shoppingMall.customer.cartItems.index(
    customerConnection,
    {
      body: {} satisfies IShoppingMallCartItem.IRequest,
    },
  );
  typia.assert(cartPage);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    cartPage.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", cartPage.pagination.limit, 20);
  TestValidator.equals(
    "pagination records count",
    cartPage.pagination.records,
    2,
  );
  TestValidator.equals("pagination pages count", cartPage.pagination.pages, 1);
  TestValidator.equals("data array length", cartPage.data.length, 2);
  // Validate each item's availability status and pricing
  for (const item of cartPage.data) {
    TestValidator.equals(
      "cart item availability_status",
      item.availability_status,
      "available",
    );
    TestValidator.predicate(
      "subtotal equals effective_price times quantity",
      Math.abs(item.subtotal - item.effective_price * item.quantity) < 0.001,
    );
    TestValidator.predicate(
      "effective_price is positive",
      item.effective_price > 0,
    );
    TestValidator.predicate("subtotal is positive", item.subtotal > 0);
  }
  // Validate both variant IDs are present in the response
  const variantIds = cartPage.data.map((item) => item.variant.id);
  TestValidator.predicate(
    "variant S is in cart",
    variantIds.includes(variantS.id),
  );
  TestValidator.predicate(
    "variant L is in cart",
    variantIds.includes(variantL.id),
  );
  // Validate quantities for each variant
  const cartItemSResponse = cartPage.data.find(
    (item) => item.variant.id === variantS.id,
  );
  const cartItemLResponse = cartPage.data.find(
    (item) => item.variant.id === variantL.id,
  );
  TestValidator.predicate(
    "cart item for size S variant found",
    cartItemSResponse !== undefined,
  );
  TestValidator.predicate(
    "cart item for size L variant found",
    cartItemLResponse !== undefined,
  );
  if (cartItemSResponse !== undefined) {
    TestValidator.equals(
      "quantity of size S cart item",
      cartItemSResponse.quantity,
      2,
    );
  }
  if (cartItemLResponse !== undefined) {
    TestValidator.equals(
      "quantity of size L cart item",
      cartItemLResponse.quantity,
      3,
    );
  }
}
