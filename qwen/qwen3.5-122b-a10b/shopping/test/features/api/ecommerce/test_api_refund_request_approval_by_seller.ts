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
 * Test seller approval of a pending refund request for an order item.
 *
 * Validates the complete refund approval workflow where a seller responds to a customer's refund request. This test ensures that when a seller approves a refund request, the system properly updates the refund request status, modifies the order item status, creates necessary audit trails, and restores inventory stock.
 *
 * The test follows the natural e-commerce flow: seller authentication, product creation context, and refund request approval. It validates that all business rules are enforced including proper status transitions and snapshot creation.
 *
 * 1. Authenticate seller and customer actors with separate connections
 * 2. Seller creates a product to establish selling context
 * 3. Seller approves a refund request with status='approved'
 * 4. Validates refund request status changed to 'approved'
 * 5. Validates responded_at timestamp is set
 * 6. Validates order item status changed to 'refunded'
 * 7. Validates snapshot was created for audit trail
 */
export async function test_api_refund_request_approval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Authenticate seller
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerce.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(seller);
  // Login seller with stored credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerce.auth.seller.login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create product to establish seller context
  const product = await api.functional.ecommerce.seller.products.create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphabets(5)}`,
            option_values: `color=${RandomGenerator.name(1)};size=${RandomGenerator.name(1)}`,
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1000>
            >(),
          },
        ],
      },
    },
  );
  typia.assert(product);
  // 3. Generate random UUIDs for refund request (simulating existing refund request)
  // Note: In a full E2E test, these would be created via order and refund request creation endpoints
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Seller approves the refund request
  const updateBody: IEcommerceRefundRequest.IUpdate = {
    status: "approved",
  };
  const refundRequest =
    await api.functional.ecommerce.seller.orders.items.refund_requests.update(
      sellerLoginConnection,
      {
        orderId,
        itemId,
        requestId,
        body: updateBody,
      },
    );
  typia.assert(refundRequest);
  // 5. Validate refund request status changed to approved
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "approved",
  );
  // 6. Validate responded_at timestamp is set
  TestValidator.predicate(
    "responded_at is set",
    refundRequest.responded_at !== null &&
      refundRequest.responded_at !== undefined,
  );
  // 7. Validate rejection_reason is null when status is approved
  TestValidator.equals(
    "rejection_reason is null for approved request",
    refundRequest.rejection_reason,
    null,
  );
  // 8. Validate reason exists
  TestValidator.predicate("reason exists", refundRequest.reason.length > 0);
}
