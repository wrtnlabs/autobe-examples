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
 * Test the unique constraint enforcement preventing duplicate cancellation requests per order item.
 *
 * Validates that the ecommerce platform enforces a database unique constraint on
 * ecommerce_platform_order_item_id, ensuring that at most one cancellation request
 * can exist per order item. The test follows the complete prerequisite chain of
 * administrative category creation, seller product and variant setup, customer
 * registration and order placement, then attempts to create duplicate cancellation
 * requests for the same order item.
 *
 * 1. Admin registers and creates a product category.
 * 2. Seller registers and creates a product within that category.
 * 3. Seller creates a product variant with SKU and options.
 * 4. Customer registers with email and credentials.
 * 5. Customer creates a shipping address for order delivery.
 * 6. Customer places an order containing the product variant.
 * 7. Customer submits first cancellation request for an order item (succeeds).
 * 8. Customer attempts duplicate cancellation request for same order item
 *    (should fail with 409 Conflict).
 * 9. Verify first request has 'pending' status and duplicate was rejected.
 */
export async function test_api_cancellation_request_duplicate_constraint_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin registers
  const adminConnection: api.IConnection = { host: connection.host };
  const adminOutput: IEcommercePlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(adminOutput);
  // 2. Admin creates category
  const category: IEcommercePlatformCategory =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(category);
  // 3. Seller registers
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerOutput: IEcommercePlatformSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: {} });
  typia.assert(sellerOutput);
  // 4. Seller creates product in the category
  const product: IEcommercePlatformProduct =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: { category_id: category.id },
      },
    );
  typia.assert(product);
  // 5. Seller creates product variant with color option
  const variant: IEcommercePlatformProductVariant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [{ attributeKey: "color", attributeValue: "red" }],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 6. Customer registers
  const customerConnection: api.IConnection = { host: connection.host };
  const customerOutput: IEcommercePlatformCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, { body: {} });
  typia.assert(customerOutput);
  // 7. Customer creates shipping address
  const shippingAddress: IEcommercePlatformShippingAddress =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      { body: {} },
    );
  typia.assert(shippingAddress);
  // 8. Customer creates order with the product variant
  const order: IEcommercePlatformOrder =
    await generate_random_ecommerce_platform_customer_orders_create(
      customerConnection,
      {
        body: {
          items: [
            {
              ecommerce_platform_product_variant_id: variant.id,
              quantity: 1,
              price: variant.price ?? product.base_price ?? 1000,
            },
          ],
          shipping_address_id: shippingAddress.id,
        },
      },
    );
  typia.assert(order);
  // Get the first order item for cancellation
  const orderItemId: string & tags.Format<"uuid"> = order.items[0].id;
  // 9. Create first cancellation request (succeeds with 201)
  const firstRequest: IEcommercePlatformCancellationRequest =
    await generate_random_ecommerce_platform_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          orderItemId,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(firstRequest);
  // 10. Attempt duplicate cancellation request (should fail with 409 Conflict)
  await TestValidator.error(
    "duplicate cancellation requests conflict",
    async () => {
      await api.functional.ecommercePlatform.customer.cancellation_requests.create(
        customerConnection,
        {
          body: {
            orderItemId,
            reason: RandomGenerator.paragraph({ sentences: 1 }),
          },
        },
      );
    },
  );
  // Validate first request has correct status
  TestValidator.equals(
    "cancellation request status",
    firstRequest.status,
    "pending",
  );
}