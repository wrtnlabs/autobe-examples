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
 * Test customer retrieves a refund request after seller approval.
 *
 * Validates the complete refund request lifecycle from creation through seller approval to customer retrieval. Ensures that the status field reflects 'approved' after seller action, respondedAt is populated with a non-null timestamp, updatedAt reflects the time of the seller's approval, and the original refundReason provided by the customer is preserved intact. Also verifies that orderItem and sellerProfile references remain accurate and unchanged, and createdAt timestamp remains unchanged from initial creation.
 *
 * This test confirms that seller approval properly updates the refund request entity while preserving all customer-submitted information, maintaining data integrity throughout the refund workflow.
 *
 * 1. Administrator joins and logs in to create a product category.
 * 2. Seller joins and logs in to create a product and variant.
 * 3. Customer joins and logs in to create a shipping address.
 * 4. Customer creates an order with the product variant.
 * 5. Customer creates a refund request for the order item.
 * 6. Seller approves the refund request.
 * 7. Customer retrieves the refund request and validates all fields.
 */
export async function test_api_refund_request_retrieval_after_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login to create category
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const category =
    await generate_random_ecommerce_platform_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller setup - join and login to create product and variant
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id: category.id } },
    );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 3. Customer setup - join and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    },
  });
  // 4. Customer creates shipping address
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  // 5. Customer creates order with product variant
  const order = await generate_random_ecommerce_platform_customer_orders_create(
    customerConnection,
    {
      body: {
        items: [
          {
            ecommerce_platform_product_variant_id: variant.id,
            quantity: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            price: variant.price ?? product.base_price,
          },
        ],
        shipping_address_id: address.id,
      },
    },
  );
  typia.assert(order);
  // 6. Customer creates refund request with specific reason
  const originalRefundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await generate_random_ecommerce_platform_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: order.items[0].id,
          refund_reason: originalRefundReason,
        },
      },
    );
  typia.assert(refundRequest);
  const originalCreatedAt = refundRequest.createdAt;
  const originalOrderItem = refundRequest.orderItem;
  const originalSellerProfile = refundRequest.sellerProfile;
  // 7. Seller approves the refund request
  const updateBody = {
    status: "approved",
  } satisfies IEcommercePlatformRefundRequest.IUpdate;
  await api.functional.ecommercePlatform.seller.refund_requests.update(
    sellerConnection,
    {
      refundRequestId: refundRequest.id,
      body: updateBody,
    },
  );
  // 8. Customer retrieves the refund request after approval
  const retrievedRefund =
    await api.functional.ecommercePlatform.customer.refund_requests.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(retrievedRefund);
  // 9. Validate all conditions
  // (1) Status reflects 'approved'
  TestValidator.equals(
    "status is approved",
    retrievedRefund.status,
    "approved",
  );
  // (2) respondedAt is populated with non-null timestamp
  TestValidator.predicate(
    "respondedAt is populated",
    retrievedRefund.respondedAt !== null &&
      retrievedRefund.respondedAt !== undefined,
  );
  // (3) updatedAt reflects the time of seller's approval (should be >= original createdAt)
  TestValidator.predicate(
    "updatedAt is after or equal to createdAt",
    new Date(retrievedRefund.updatedAt).getTime() >=
      new Date(retrievedRefund.createdAt).getTime(),
  );
  // (4) Original refundReason is preserved intact
  TestValidator.equals(
    "refundReason preserved",
    retrievedRefund.refundReason,
    originalRefundReason,
  );
  // (5) orderItem reference remains accurate
  TestValidator.equals(
    "orderItem id unchanged",
    retrievedRefund.orderItem.id,
    originalOrderItem.id,
  );
  TestValidator.equals(
    "orderItem product variant unchanged",
    retrievedRefund.orderItem.productVariant.id,
    originalOrderItem.productVariant.id,
  );
  // (5) sellerProfile reference remains accurate
  TestValidator.equals(
    "sellerProfile id unchanged",
    retrievedRefund.sellerProfile.id,
    originalSellerProfile.id,
  );
  // (6) createdAt timestamp remains unchanged
  TestValidator.equals(
    "createdAt unchanged",
    retrievedRefund.createdAt,
    originalCreatedAt,
  );
}
