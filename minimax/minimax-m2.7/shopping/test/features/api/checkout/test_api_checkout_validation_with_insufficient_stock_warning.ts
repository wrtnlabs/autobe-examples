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
import { generate_random_ecommerce_mall_customer_customers_me_addresses_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_addresses_create";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_shipping_address } from "../../../prepare/prepare_random_ecommerce_mall_shipping_address";

export async function test_api_checkout_validation_with_insufficient_stock_warning(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer with tracked password
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      password: customerPassword,
    },
  });
  typia.assert(customerAuth);
  // 2. Create default shipping address
  const addressInput = prepare_random_ecommerce_mall_shipping_address();
  addressInput.is_default = true;
  const address =
    await generate_random_ecommerce_mall_customer_customers_me_addresses_create(
      customerConnection,
      {
        body: addressInput satisfies IEcommerceMallShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 3. Create and approve a seller with tracked password
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      password: sellerPassword,
    },
  });
  typia.assert(sellerAuth);
  // 4. Register and login as admin to approve seller
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // Approve the seller
  await api.functional.ecommerceMall.admin.admin.sellers.approve(
    adminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  // 5. Login as approved seller
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(approvedSellerConnection, {
    body: {
      email: sellerAuth.email,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 6. Create a product with variant
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      approvedSellerConnection,
      {},
    );
  typia.assert(product);
  // Get the first variant
  const variant = product.variants[0];
  typia.assert(variant);
  // 7. Add limited inventory (3 units)
  await generate_random_ecommerce_mall_seller_sellers_me_variants_inventory_add(
    approvedSellerConnection,
    {
      body: {
        quantityChange: 3,
        reason: "Initial stock for testing",
      },
      params: {
        variantId: variant.id,
      },
    },
  );
  // 8. Login as customer and add larger quantity to cart (5 units, exceeding 3 available)
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // Add 5 units to cart (more than 3 available)
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerLoginConnection,
      {
        body: {
          quantity: 5,
          variantId: variant.id,
        },
      },
    );
  typia.assert(cartItem);
  // 9. Call checkout validation
  const validation =
    await api.functional.ecommerceMall.customer.customers.me.checkout.validate.validateCheckout(
      customerLoginConnection,
    );
  typia.assert(validation);
  // Validate response structure
  TestValidator.equals("isValid should be true", validation.isValid, true);
  TestValidator.equals("errors should be empty", validation.errors, []);
  TestValidator.predicate(
    "warnings array should exist and be non-empty",
    validation.warnings !== null &&
      validation.warnings !== undefined &&
      validation.warnings.length > 0,
  );
  // Find the LOW_STOCK warning
  const lowStockWarning = validation.warnings?.find(
    (w) => w.code === "LOW_STOCK",
  );
  TestValidator.predicate(
    "LOW_STOCK warning should exist",
    lowStockWarning !== null && lowStockWarning !== undefined,
  );
  TestValidator.equals(
    "warning should reference cart item",
    lowStockWarning!.cartItemId,
    cartItem.id,
  );
  TestValidator.predicate(
    "warning message should contain stock info",
    lowStockWarning!.message !== null && lowStockWarning!.message !== undefined,
  );
  // Validate cart item results
  const itemResult = validation.items?.find(
    (i) => i.cartItemId === cartItem.id,
  );
  TestValidator.predicate(
    "item result should exist",
    itemResult !== null && itemResult !== undefined,
  );
  TestValidator.equals(
    "hasWarning should be true",
    itemResult!.hasWarning,
    true,
  );
  TestValidator.equals(
    "availableStock should be 3",
    itemResult!.availableStock,
    3,
  );
  TestValidator.equals("cartQuantity should be 5", itemResult!.cartQuantity, 5);
  TestValidator.predicate(
    "item should be available",
    itemResult!.isAvailable,
  );
  // Validate shipping address is populated
  TestValidator.predicate(
    "shippingAddress should exist",
    validation.shippingAddress !== null &&
      validation.shippingAddress !== undefined,
  );
}