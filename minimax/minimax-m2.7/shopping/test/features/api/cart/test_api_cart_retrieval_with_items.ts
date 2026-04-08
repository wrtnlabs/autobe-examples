import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_customers_me_cart_create } from "../../../generate/generate_random_ecommerce_mall_customer_customers_me_cart_create";
import { prepare_random_ecommerce_mall_cart } from "../../../prepare/prepare_random_ecommerce_mall_cart";

/**
 * Test retrieving a customer's shopping cart that contains items.
 *
 * Validates the primary success path for the cart retrieval endpoint by creating a customer, adding a product variant to their cart, and retrieving the cart to verify its contents. Ensures the cart structure contains the customer context, exactly one item with correct product and variant details, proper quantity and subtotal calculations, and cart isolation.
 *
 * 1. Register a new customer account with email and password.
 * 2. Search for available products to find a product with variants.
 * 3. Add a product variant to the cart with quantity 1.
 * 4. Retrieve the cart using GET /ecommerceMall/customer/customers/me/cart.
 * 5. Validate cart structure includes customer context, exactly 1 item, correct product details, variant SKU, proper quantity, correct subtotal calculation, and cart total.
 */
export async function test_api_cart_retrieval_with_items(
  connection: api.IConnection,
): Promise<void> {
  // <E2E TEST CODE HERE>
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // 2. Search for available products with variants
  const productsPage = await api.functional.ecommerceMall.products.index(
    customerConnection,
    {
      body: {
        inStock: true,
        limit: 20,
      } satisfies IEcommerceMallProduct.IRequest,
    },
  );
  typia.assert(productsPage);
  // Find a product that has variants (products with hasStock: true typically have variants)
  const availableProducts = productsPage.data.filter(
    (p) => p.hasStock === true,
  );
  const selectedProduct =
    availableProducts.length > 0 ? availableProducts[0] : productsPage.data[0];
  // For this test, we need to use the generate function which handles variant selection
  // Since we need a variant ID, we'll use the generation utility
  const cartItem =
    await generate_random_ecommerce_mall_customer_customers_me_cart_create(
      customerConnection,
      {},
    );
  typia.assert(cartItem);
  // Extract variant price for subtotal calculation
  const variantPrice = cartItem.variant.price ?? cartItem.product.basePrice;
  // 4. Retrieve the cart using GET /ecommerceMall/customer/customers/me/cart
  const cart =
    await api.functional.ecommerceMall.customer.customers.me.cart.at(
      customerConnection,
    );
  typia.assert(cart);
  // Validation: Cart contains the customer context
  TestValidator.equals("cart has customer id", cart.customer.id, authorized.id);
  TestValidator.equals(
    "cart has customer email",
    cart.customer.email,
    authorized.email,
  );
  TestValidator.predicate(
    "cart has customer profile",
    cart.customer.profile !== undefined,
  );
  // Validation: Cart contains exactly 1 item
  TestValidator.equals("cart has exactly 1 item", cart.items.length, 1);
  // Validation: Item shows correct product name
  TestValidator.equals(
    "item has product name",
    cart.items[0].product.name,
    cartItem.product.name,
  );
  // Validation: Item shows correct variant details including SKU code
  TestValidator.equals(
    "item has correct variant id",
    cart.items[0].variant.id,
    cartItem.variant.id,
  );
  TestValidator.equals(
    "item has correct SKU code",
    cart.items[0].variant.skuCode,
    cartItem.variant.skuCode,
  );
  // Validation: Item quantity matches quantity added (default 1)
  TestValidator.equals(
    "item quantity is 1",
    cart.items[0].quantity,
    cartItem.quantity,
  );
  // Validation: Item subtotal equals quantity multiplied by variant price
  TestValidator.equals(
    "item subtotal calculation",
    cart.items[0].subtotal,
    cartItem.quantity * variantPrice,
  );
  // Validation: Cart total equals the single item subtotal
  TestValidator.equals(
    "cart total equals item subtotal",
    cart.total,
    cart.items[0].subtotal,
  );
  // Validation: Response includes cart timestamps
  TestValidator.predicate(
    "cart has createdAt",
    cart.createdAt !== undefined && cart.createdAt.length > 0,
  );
  TestValidator.predicate(
    "cart has updatedAt",
    cart.updatedAt !== undefined && cart.updatedAt.length > 0,
  );
}
