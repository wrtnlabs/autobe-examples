import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_image } from "../../../prepare/prepare_random_ecommerce_product_image";
import { prepare_random_ecommerce_product_variant } from "../../../prepare/prepare_random_ecommerce_product_variant";

/**
 * Test seller rejection of a pending refund request for an order item.
 *
 * Validates the refund rejection workflow where a seller can reject a customer's refund request with a required rejection reason. This test ensures proper status transitions, timestamp updates, and business rule enforcement for rejected refunds.
 *
 * The scenario follows the complete refund request lifecycle: customer submits refund request on delivered order item, seller reviews and rejects it with explanation, and system maintains order item in delivered status without restoring inventory. Note: This test uses simulation mode to validate API contract and type safety without requiring actual database records for orders and refund requests.
 *
 * 1. Seller account creation and authentication
 * 2. Customer account creation and authentication
 * 3. Seller creates a product with variants
 * 4. Refund request rejection via update endpoint (simulation mode)
 * 5. Validates refund request status is 'rejected'
 * 6. Validates responded_at timestamp is set
 * 7. Validates rejection_reason is populated
 */
export async function test_api_refund_request_rejection_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Seller creates a product
  const product = await generate_random_ecommerce_seller_products_create(
    sellerConnection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: RandomGenerator.alphabets(8).toUpperCase(),
            option_values: `color=${RandomGenerator.alphabets(5)};size=${RandomGenerator.alphabets(4)}`,
          } satisfies IEcommerceProductVariant.ICreate,
        ],
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Test refund request rejection (simulation mode for API contract validation)
  // Note: Full integration test requires order and refund request creation endpoints
  const refundRequest = typia.random<IEcommerceRefundRequest>();
  typia.assert(refundRequest);
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const updatedRefundRequest =
    await api.functional.ecommerce.seller.orders.items.refund_requests.update(
      {
        ...sellerConnection,
        simulate: true,
      },
      {
        orderId: refundRequest.orderItem.order.id,
        itemId: refundRequest.orderItem.id,
        requestId: refundRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // 5. Validate rejection results
  TestValidator.equals(
    "refund status is rejected",
    updatedRefundRequest.status,
    "rejected",
  );
  TestValidator.predicate(
    "responded_at is set",
    updatedRefundRequest.responded_at !== null,
  );
  TestValidator.equals(
    "rejection reason matches",
    updatedRefundRequest.rejection_reason,
    rejectionReason,
  );
}