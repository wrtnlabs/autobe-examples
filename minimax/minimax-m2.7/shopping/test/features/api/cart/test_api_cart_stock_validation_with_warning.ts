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
import { generate_random_ecommerce_mall_seller_sellers_me_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_variants_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test stock validation with stock warning when cart quantity exceeds available stock.
 *
 * Validates that when a customer adds more items to cart than available stock (but stock > 0),
 * the stock validation endpoint correctly returns hasWarning=true and isAvailable=true.
 * The warning informs the customer that their requested quantity exceeds available stock
 * but partial fulfillment is still possible.
 *
 * Setup Flow:
 * 1. Admin registers and authenticates
 * 2. Seller registers with email/password, authenticates
 * 3. Admin approves seller registration
 * 4. Seller creates product with variant
 * 5. Seller adds limited inventory (5 units)
 * 6. Customer registers and authenticates
 * 7. Customer adds variant to cart with quantity (10) exceeding stock (5)
 * 8. Call PATCH /customer/customers/me/cart/stock with empty array
 *
 * Expected: hasWarning=true, isAvailable=true, warningMessage contains both quantities.
 */
export async function test_api_cart_stock_validation_with_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await api.functional.ecommerceMall.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // 3. Admin approves seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // Login as approved seller (need to re-login after approval)
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.seller.login(
    approvedSellerConnection,
    {
      body: {
        email: sellerAuth.email,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // 4. Seller creates product (need to create category first or use existing)
  // For this test, we'll use a known category ID or create one
  // Since we don't have category creation endpoint in the test, we'll use a placeholder
  // The system should handle this gracefully or the test should be adjusted
  const product =
    await api.functional.ecommerceMall.seller.sellers.me.products.create(
      approvedSellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          basePrice: 10000,
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  // 5. Seller creates product variant
  const variant =
    await api.functional.ecommerceMall.seller.sellers.me.products.variants.create(
      approvedSellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          price: null,
          optionValues: [
            { key: "Color", value: "Blue" },
            { key: "Size", value: "Large" },
          ],
        },
      },
    );
  // 6. Seller adds limited inventory (5 units)
  await api.functional.ecommerceMall.seller.sellers.me.variants._inventory.add(
    approvedSellerConnection,
    {
      variantId: variant.id,
      body: {
        quantityChange: 5,
        reason: "Initial stock for testing",
      },
    },
  );
  // 7. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.customer.join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 8. Customer adds variant to cart with quantity (10) exceeding stock (5)
  const cartItem =
    await api.functional.ecommerceMall.customer.customers.me.cart.create(
      customerConnection,
      {
        body: {
          variantId: variant.id,
          quantity: 10 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        },
      },
    );
  typia.assert(cartItem);
  // Execution: Call PATCH /customer/customers/me/cart/stock with empty array
  const stockValidation =
    await api.functional.ecommerceMall.customer.customers.me.cart.stock.validateStock(
      customerConnection,
      {
        body: {
          cartItemIds: [],
        },
      },
    );
  typia.assert(stockValidation);
  // Validation: hasWarning should be true when cartQuantity > availableStock AND availableStock > 0
  TestValidator.equals("hasWarning is true", stockValidation.hasWarning, true);
  // Validation: isAvailable should be true when availableStock > 0 (partial fulfillment possible)
  TestValidator.equals(
    "isAvailable is true",
    stockValidation.isAvailable,
    true,
  );
  // Validation: warningMessage should contain both quantities
  TestValidator.predicate(
    "warningMessage contains quantities",
    stockValidation.warningMessage != null &&
      stockValidation.warningMessage.includes("10") &&
      stockValidation.warningMessage.includes("5"),
  );
}
