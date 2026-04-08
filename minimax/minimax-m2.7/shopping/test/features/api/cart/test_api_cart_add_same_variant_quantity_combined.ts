import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

/**
 * Test adding the same product variant to cart when it already exists - quantities should be combined rather than creating duplicate entries.
 *
 * This test validates the cart item quantity combination behavior. When a customer adds the same product variant to their cart that already exists, the quantities are combined (not replaced). This ensures:
 *
 * 1. The cart item's quantity is updated to the sum of existing + new quantity
 * 2. The created_at timestamp remains unchanged (preserves original add time)
 * 3. The updated_at timestamp is refreshed to current time
 * 4. Only one cart item exists per variant (no duplicates)
 * 5. The subtotal correctly reflects the combined quantity
 *
 * **Test Flow:**
 * 1. Set up: Create customer, approved seller, product with variant, and inventory
 * 2. First cart add: Add variant with quantity 2 to establish baseline
 * 3. Second cart add (TARGET): Add same variant with quantity 3
 * 4. Validate: Combined quantity (5), timestamps, no duplicates, correct subtotal
 */
export async function test_api_cart_add_same_variant_quantity_combined(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up: Create admin for seller approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  // 2. Set up: Create and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
    },
  });
  const sellerId = sellerAuth.id;
  // 3. Admin approves seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId,
    },
  );
  // 4. Seller re-authenticates after approval to get valid session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 5. Create product with variant using generation function
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerLoginConnection,
      {},
    );
  typia.assert(product);
  // Get variant ID from product
  const variant = product.variants[0];
  const variantId = variant.id;
  // 6. Seller adds inventory to the variant
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    sellerLoginConnection,
    {
      params: { variantId },
      body: {
        quantityChange: 100,
        reason: "Initial stock for cart test",
      },
    },
  );
  // 7. Create and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 8. First cart add: Add variant with quantity 2
  const firstAdd =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId,
          quantity: 2,
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(firstAdd);
  // Store original created_at timestamp
  const originalCreatedAt = firstAdd.createdAt;
  // Small delay to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  // 9. Second cart add: Add same variant with quantity 3 (TARGET TEST)
  const secondAdd =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId,
          quantity: 3,
        } satisfies IEcommerceMallCart.ICreate,
      },
    );
  typia.assert(secondAdd);
  // 10. Validate combined quantity (2 + 3 = 5)
  TestValidator.equals("combined quantity is 5", secondAdd.quantity, 5);
  // 11. Validate created_at remains unchanged (preserves original add time)
  TestValidator.equals(
    "created_at unchanged",
    secondAdd.createdAt,
    originalCreatedAt,
  );
  // 12. Validate updated_at is refreshed to current time
  TestValidator.predicate(
    "updated_at is refreshed",
    new Date(secondAdd.updatedAt).getTime() >
      new Date(originalCreatedAt).getTime(),
  );
  // 13. Validate only one cart item exists for this variant (same ID returned)
  TestValidator.equals(
    "same cart item returned (no duplicate)",
    secondAdd.id,
    firstAdd.id,
  );
  // 14. Validate variantId remains the same
  TestValidator.equals("variantId unchanged", secondAdd.variant.id, variantId);
  // 15. Validate subtotal = combined quantity * unit price
  const unitPrice = secondAdd.variant.price ?? secondAdd.product.basePrice;
  TestValidator.equals(
    "correct subtotal (5 * unitPrice)",
    secondAdd.subtotal,
    5 * unitPrice,
  );
}
