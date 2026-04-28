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
 * Test cancellation request creation for a paid order item before shipping.
 *
 * Validates the complete prerequisite chain including admin category creation, seller product and variant setup, customer order placement, and cancellation request submission. Ensures the cancellation request correctly references the target order item and authenticated customer, with proper initialization of status and timestamps.
 *
 * Special attention is given to verifying that the cancellation request enters 'pending' status awaiting seller review, that seller_response_reason is null on creation, and that all relational references (orderItem, customer) are correctly established.
 *
 * 1. Administrator registers and creates a product category.
 * 2. Seller registers and creates a product in the category.
 * 3. Seller creates a product variant with SKU options.
 * 4. Customer registers and creates a shipping address.
 * 5. Customer places an order containing the product variant.
 * 6. Customer submits a cancellation request for the order item.
 * 7. Validates cancellation request details including status, references, and timestamps.
 */
export async function test_api_cancellation_request_creation_for_paid_order_item(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - register and create category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - register and create product
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  // 3. Seller creates product variant
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Customer setup - register and create shipping address
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(
    customerConnection,
    {},
  );
  typia.assert(customerAuthorized);
  const shippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(shippingAddress);
  // 5. Customer places order containing the product variant
  const quantity: number & tags.Type<"int32"> & tags.Minimum<1> = 1;
  const price: number & tags.Minimum<0> = variant.price ?? product.base_price;
  const orderBody = {
    items: [
      {
        ecommerce_platform_product_variant_id: variant.id,
        quantity,
        price,
      },
    ],
    shipping_address_id: shippingAddress.id,
  } satisfies IEcommercePlatformOrder.ICreate;
  const order = await api.functional.ecommercePlatform.customer.orders.create(
    customerConnection,
    { body: orderBody },
  );
  typia.assert(order);
  // Get the first order item from the created order
  const orderItem = order.items[0];
  // 6. Customer submits cancellation request for the order item
  const reason = RandomGenerator.paragraph({ sentences: 2 });
  const cancellationRequest =
    await api.functional.ecommercePlatform.customer.cancellation_requests.create(
      customerConnection,
      {
        body: {
          orderItemId: orderItem.id,
          reason,
        } satisfies IEcommercePlatformCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  // 7. Validate cancellation request
  TestValidator.equals(
    "orderItem matches submitted order item",
    cancellationRequest.orderItem.id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer email matches authenticated customer",
    cancellationRequest.customer.email,
    customerAuthorized.email,
  );
  TestValidator.equals(
    "reason matches submitted reason",
    cancellationRequest.reason,
    reason,
  );
  TestValidator.equals(
    "status is pending",
    cancellationRequest.status,
    "pending",
  );
  TestValidator.equals(
    "seller_response_reason is null on creation",
    cancellationRequest.seller_response_reason,
    null,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    cancellationRequest.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    cancellationRequest.updated_at.length > 0,
  );
}
