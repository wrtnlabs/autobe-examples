import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCancellationRequest";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
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
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_cancellation_request } from "../../../prepare/prepare_random_ecommerce_platform_cancellation_request";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test seller approval of a pending cancellation request with inventory restoration.
 *
 * Validates the complete cancellation approval workflow: admin creates a product category, seller creates a product with variant stock, customer places an order, customer submits a cancellation request, and seller approves it. Verifies the cancellation request transitions to 'approved' status with null seller response reason and updated timestamp.
 *
 * 1. Admin creates category and seller creates product with stock.
 * 2. Customer places order for the product variant.
 * 3. Customer creates pending cancellation request for the order item.
 * 4. Seller approves the cancellation, transitioning status to 'approved'.
 * 5. Validates response has 'approved' status, null seller_response_reason, and valid timestamps.
 *
 */
export async function test_api_seller_approve_pending_cancellation_with_inventory_restoration(
  connection: api.IConnection,
) {
  // 1. Admin creates a product category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "12345678",
      href: "https://test.com/admin",
      referrer: "https://test.com/referrer",
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  const category =
    await api.functional.ecommercePlatform.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommercePlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  // 2. Seller joins and logs in
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "12345678",
      href: "https://test.com/seller",
      referrer: "https://test.com/referrer",
    } satisfies IEcommercePlatformSeller.IJoin,
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: "12345678",
      href: "https://test.com/seller",
      referrer: "https://test.com/referrer",
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  // 3. Seller creates a product
  const product = await api.functional.ecommercePlatform.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<number>() satisfies number,
        category_id: category.id,
      } satisfies IEcommercePlatformProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with stock
  const variant =
    await api.functional.ecommercePlatform.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: 1000,
          options: [
            {
              attributeKey: "color",
              attributeValue: "Red",
            },
          ],
        } satisfies IEcommercePlatformProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Customer joins and logs in
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: "12345678",
      href: "https://test.com/customer",
      referrer: "https://test.com/referrer",
    } satisfies IEcommercePlatformCustomer.IJoin,
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: "12345678",
    } satisfies IEcommercePlatformCustomer.ILogin,
  });
  // 6. Customer creates shipping address
  const shippingAddress =
    await api.functional.ecommercePlatform.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipientName: RandomGenerator.name(),
          phoneNumber: RandomGenerator.mobile(),
          streetAddress: `${RandomGenerator.name()} ${RandomGenerator.alphaNumeric(5)}`,
          city: "Seoul",
          state: "Gangnam-gu",
          postalCode: "06000",
          country: "South Korea",
          isDefault: true,
        } satisfies IEcommercePlatformShippingAddress.ICreate,
      },
    );
  typia.assert(shippingAddress);
  // 7. Customer places order
  const orderData: IEcommercePlatformOrder.ICreate = {
    items: [
      {
        ecommerce_platform_product_variant_id: variant.id,
        quantity: 1,
        price: 1000,
      },
    ],
    shipping_address_id: shippingAddress.id,
  };
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    {
      body: orderData,
    },
  );
  typia.assert(order);
  // 8. Customer creates cancellation request
  const orderItemId = order.items[0].id;
  const cancellationRequestData: IEcommercePlatformCancellationRequest.ICreate =
    {
      orderItemId: orderItemId,
      reason: RandomGenerator.paragraph({ sentences: 2 }),
    };
  const cancellationRequest =
    await api.functional.ecommercePlatform.customer.cancellation_requests.create(
      customerConnection,
      {
        body: cancellationRequestData,
      },
    );
  typia.assert(cancellationRequest);
  // 9. Seller approves the cancellation request
  const updatedCancellationRequest =
    await api.functional.ecommercePlatform.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(updatedCancellationRequest);
  // 10. Validate response
  TestValidator.equals(
    "status is approved",
    updatedCancellationRequest.status,
    "approved",
  );
  TestValidator.equals(
    "seller_response_reason is null",
    updatedCancellationRequest.seller_response_reason,
    null,
  );
  TestValidator.predicate(
    "updated_at updated timestamp is valid",
    updatedCancellationRequest.updated_at !== null &&
      typeof updatedCancellationRequest.updated_at === "string" &&
      updatedCancellationRequest.updated_at.length > 0,
  );
}
