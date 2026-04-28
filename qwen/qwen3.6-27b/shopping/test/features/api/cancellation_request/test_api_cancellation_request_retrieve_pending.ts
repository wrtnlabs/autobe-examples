import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformShoppingCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShoppingCartItem";
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
import { generate_random_ecommerce_platform_admin_categories_create } from "../../../generate/generate_random_ecommerce_platform_admin_categories_create";
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_cancellation_requests_create";
import { generate_random_ecommerce_platform_customer_cart_checkout } from "../../../generate/generate_random_ecommerce_platform_customer_cart_checkout";
import { generate_random_ecommerce_platform_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_platform_customer_cart_items_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_cancellation_request } from "../../../prepare/prepare_random_ecommerce_platform_cancellation_request";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_checkout } from "../../../prepare/prepare_random_ecommerce_platform_checkout";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";
import { prepare_random_ecommerce_platform_shopping_cart_item } from "../../../prepare/prepare_random_ecommerce_platform_shopping_cart_item";

/**
 * End-to-end test for retrieving a pending cancellation request after a complete purchase workflow.
 *
 * Validates the full lifecycle from category creation, product listing, variant setup, customer registration,
 * cart management, checkout processing, and cancellation request submission and retrieval.
 * Confirms that the system correctly maintains the pending status, preserves the original request reason,
 * accurately links the cancellation to the specific order item and customer context, and records accurate
 * creation and update timestamps.
 *
 * 1. Administrator authenticates and creates a product category.
 * 2. Seller authenticates and creates a product within the category, followed by a product variant.
 * 3. Customer authenticates, creates a shipping address, adds the variant to the cart, and completes checkout.
 * 4. Customer submits a cancellation request for the purchased order item.
 * 5. Customer retrieves the cancellation request by its unique identifier.
 * 6. Validates the response contains the correct pending status, matches the original reason,
 *    correctly references the order item and customer, and includes accurate timestamps.
 */
export async function test_api_cancellation_request_retrieve_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: "admin@test.com",
    password: "AdminPass123!",
    href: "https://platform.com/admin/register",
    referrer: "https://platform.com",
  } satisfies IEcommercePlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinBody });
  const adminLoginBody = {
    email: "admin@test.com",
    password: "AdminPass123!",
    href: "https://platform.com/admin/login",
    referrer: "https://platform.com",
  } satisfies IEcommercePlatformAdmin.ILogin;
  await authorize_admin_login(adminConnection, { body: adminLoginBody });
  // 2. Admin creates category
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 3. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: "seller@test.com",
    password: "SellerPass123!",
    href: "https://platform.com/seller/register",
    referrer: "https://platform.com",
  } satisfies IEcommercePlatformSeller.IJoin;
  await authorize_seller_join(sellerConnection, { body: sellerJoinBody });
  const sellerLoginBody = {
    email: "seller@test.com",
    password: "SellerPass123!",
    href: "https://platform.com/seller/login",
    referrer: "https://platform.com",
  } satisfies IEcommercePlatformSeller.ILogin;
  await authorize_seller_login(sellerConnection, { body: sellerLoginBody });
  // 4. Seller creates product
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: "Wireless Headphones",
        description: "High-quality wireless headphones",
        base_price: 9999,
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Seller creates variant
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: "WH-001",
          price: 9999,
          options: [
            {
              attributeKey: "color",
              attributeValue: "black",
            } satisfies IEcommercePlatformProductVariantOption.ICreate,
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoinBody = {
    email: "customer@test.com",
    password: "CustomerPass123!",
    href: "https://platform.com/customer/register",
    referrer: "https://platform.com",
  } satisfies IEcommercePlatformCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerJoinBody });
  const customerLoginBody = {
    email: "customer@test.com",
    password: "CustomerPass123!",
  } satisfies IEcommercePlatformCustomer.ILogin;
  await authorize_customer_login(customerConnection, {
    body: customerLoginBody,
  });
  // 7. Customer creates shipping address
  const address =
    await api.functional.ecommercePlatform.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: "John Doe",
          phoneNumber: "01012345678",
          streetAddress: "123 Main Street",
          city: "Seoul",
          state: "Mapo-gu",
          postalCode: "04000",
          country: "South Korea",
          isDefault: true,
        } satisfies IEcommercePlatformShippingAddress.ICreate,
      },
    );
  typia.assert(address);
  // 8. Customer adds variant to cart
  const cartItem =
    await api.functional.ecommercePlatform.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IEcommercePlatformShoppingCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 9. Customer checks out
  const order = await api.functional.ecommercePlatform.customer.cart.checkout(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
      } satisfies IEcommercePlatformCheckout.ICreate,
    },
  );
  typia.assert(order);
  // 10. Create cancellation request
  TestValidator.predicate("order has items", order.items.length > 0);
  const orderItem = order.items[0];
  const cancellationRequest =
    await api.functional.ecommercePlatform.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason: "Changed my mind about this purchase",
        } satisfies IEcommercePlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 11. Retrieve cancellation request
  const retrievedRequest =
    await api.functional.ecommercePlatform.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 12. Validate response
  TestValidator.equals(
    "cancellation request ID matches",
    retrievedRequest.id,
    cancellationRequest.id,
  );
  TestValidator.equals("status is pending", retrievedRequest.status, "pending");
  TestValidator.equals(
    "reason is preserved",
    retrievedRequest.reason,
    cancellationRequest.reason,
  );
  TestValidator.equals(
    "order item matches",
    retrievedRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer matches",
    retrievedRequest.customer.id,
    cancellationRequest.customer.id,
  );
  TestValidator.predicate(
    "created_at timestamp exists",
    retrievedRequest.created_at != null,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    retrievedRequest.updated_at != null,
  );
}
