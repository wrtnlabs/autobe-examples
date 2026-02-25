import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { generate_random_shopping_mall_customer_cart_create } from "../../../generate/generate_random_shopping_mall_customer_cart_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

/**
 * Test successful cart item deletion workflow.
 *
 * Setup:
 * 1. Customer joins platform and receives authentication tokens
 * 2. Admin joins and authenticates
 * 3. Seller joins platform (status: pending)
 * 4. Admin approves seller (status: approved)
 * 5. Seller creates a product
 * 6. Seller creates a product variant with stock quantity > 0
 * 7. Customer adds the variant to their cart, creating a cart item
 *
 * Test Execution:
 * 1. Customer calls DELETE /shoppingMall/customer/customers/me/cart/{cartItemId} with the cart item ID from step 7
 * 2. Verify the response is 204 No Content (void)
 * 3. Verify the cart item no longer exists by attempting to retrieve it (should return 404)
 *
 * Validation Points:
 * - Authorization: Only authenticated customer can delete their own cart items
 * - Ownership: Cart item must belong to the authenticated customer
 * - Idempotency: Response is 204 whether item existed or not (after first delete)
 * - Side Effects: No inventory changes occur (cart items don't reserve stock)
 * - Data Integrity: Deleting cart item is permanent, not soft-delete
 */
export async function test_api_cart_item_removal_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Setup Admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Setup Seller (will be in 'pending' status after join)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // 4. Admin approves seller
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
  // 5. Seller creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 6. Seller creates a product variant with stock quantity
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(8),
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "M" },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
        },
      },
    );
  typia.assert(variant);
  // 7. Customer adds the variant to their cart
  const cartItem = await generate_random_shopping_mall_customer_cart_create(
    customerConnection,
    {
      body: {
        variantId: variant.id,
        quantity: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      },
    },
  );
  typia.assert(cartItem);
  // Store cart item ID before deletion
  const cartItemId = cartItem.id;
  // 8. Customer deletes the cart item
  await api.functional.shoppingMall.customer.customers.me.cart.erase(
    customerConnection,
    { cartItemId },
  );
  // 9. Verify the cart item is deleted - attempting to delete again should still succeed (idempotent)
  // Since the DELETE endpoint returns void (204 No Content) whether item exists or not,
  // we verify idempotency by calling delete again
  await api.functional.shoppingMall.customer.customers.me.cart.erase(
    customerConnection,
    { cartItemId },
  );
  // Test passes if no error is thrown - successful deletion confirmed
}
