import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformRefundRequest";
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
import { generate_random_ecommerce_platform_customer_orders_create } from "../../../generate/generate_random_ecommerce_platform_customer_orders_create";
import { generate_random_ecommerce_platform_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_platform_customer_refund_requests_create";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { prepare_random_ecommerce_platform_category } from "../../../prepare/prepare_random_ecommerce_platform_category";
import { prepare_random_ecommerce_platform_order } from "../../../prepare/prepare_random_ecommerce_platform_order";
import { prepare_random_ecommerce_platform_order_item } from "../../../prepare/prepare_random_ecommerce_platform_order_item";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";
import { prepare_random_ecommerce_platform_refund_request } from "../../../prepare/prepare_random_ecommerce_platform_refund_request";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test retrieval of a pending refund request submitted by a customer.
 *
 * Validates the complete refund request lifecycle from creation through product ownership chain traversal. Ensures that a newly created refund request returns with correct pending status, null response timestamp, and accurate seller profile derived from the product variant ownership chain.
 *
 * Special attention is given to verifying the seller profile resolution through the order item → product variant → product → seller relationship, confirming that the refund reason provided by the customer is preserved exactly, and validating that the order item reference captures the correct variant details including quantity and price at time of purchase.
 *
 * 1. Administrator creates a product category for product assignment.
 * 2. Seller registers and creates a product listing with a variant.
 * 3. Customer registers, creates shipping address, and places an order.
 * 4. Customer submits a refund request for the purchased order item.
 * 5. Customer retrieves the refund request by its ID.
 * 6. Validates pending status, null respondedAt, seller profile, and order item details.
 */
export async function test_api_refund_request_retrieval_pending_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin creates category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller creates product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {},
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 3. Customer creates address and order
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const price: number = (variant.price ??
    product.base_price) satisfies number as number;
  const quantity = 1 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> as number & tags.Type<"int32"> & tags.Minimum<1>;
  const orderItems = [
    {
      ecommerce_platform_product_variant_id: variant.id,
      quantity,
      price,
    },
  ] satisfies IEcommercePlatformOrderItem.ICreate[] & tags.MinItems<1>;
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        shipping_address_id: address.id,
        items: orderItems,
      },
    },
  );
  typia.assert(order);
  const orderItemId = order.items[0].id satisfies string &
    tags.Format<"uuid"> as string & tags.Format<"uuid">;
  // 4. Customer creates refund request
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_ecommerce_platform_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          refund_reason: refundReason,
        },
      },
    );
  typia.assert(refundRequest);
  // 5. Retrieve refund request by ID
  const retrieved =
    await api.functional.ecommercePlatform.customer.refund_requests.at(
      customerConnection,
      { refundRequestId: refundRequest.id },
    );
  typia.assert(retrieved);
  // 6. Validate response fields
  TestValidator.equals("status is pending", retrieved.status, "pending");
  TestValidator.equals("respondedAt is null", retrieved.respondedAt, null);
  TestValidator.equals(
    "refund reason matches",
    retrieved.refundReason,
    refundReason,
  );
  TestValidator.equals(
    "order item variant matches",
    retrieved.orderItem.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "order item quantity matches",
    retrieved.orderItem.quantity,
    quantity,
  );
  TestValidator.equals(
    "order item price matches",
    retrieved.orderItem.price,
    price,
  );
  TestValidator.predicate(
    "has valid createdAt timestamp",
    typeof retrieved.createdAt === "string" && retrieved.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has valid updatedAt timestamp",
    typeof retrieved.updatedAt === "string" && retrieved.updatedAt.length > 0,
  );
  TestValidator.equals(
    "seller profile ID matches product seller",
    retrieved.sellerProfile.id,
    product.seller.id,
  );
}
