import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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
import { generate_random_shopping_mall_customer_orders_create } from "../../../generate/generate_random_shopping_mall_customer_orders_create";
import { generate_random_shopping_mall_customer_refund_requests_create } from "../../../generate/generate_random_shopping_mall_customer_refund_requests_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_order } from "../../../prepare/prepare_random_shopping_mall_order";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";
import { prepare_random_shopping_mall_refund_request } from "../../../prepare/prepare_random_shopping_mall_refund_request";

/**
 * Test the complete refund request approval workflow where a seller approves
 * a customer's refund request for a delivered order item.
 *
 * **Test Setup:**
 * 1. Seller registers and logs in
 * 2. Customer registers and logs in
 * 3. Customer creates a refund request for an order item (prerequisites handled by generation function)
 *
 * **Test Execution:**
 * 1. Seller authenticates and calls PUT /seller/refund-requests/{refundRequestId} with status=APPROVED
 * 2. Verify the refund request status changes from PENDING to APPROVED
 * 3. Verify responded_by_seller_id is set to the authenticated seller's ID
 * 4. Verify responded_at timestamp is populated
 * 5. Verify the associated order item status changes to REFUNDED
 *
 * **Validation Points:**
 * - Refund request status must be APPROVED
 * - Order item status must be REFUNDED
 * - responded_by_seller_id must match seller's ID
 * - responded_at must be populated
 * - respondedBySeller information must be included in response
 */
export async function test_api_refund_request_seller_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller Setup - Register and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerJoin.email,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      // ip is optional for seller login (ip?: ... | undefined), so omit it
    } satisfies IShoppingMallSeller.ILogin,
  });
  typia.assert(sellerLogin);
  // 2. Customer Setup - Register and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const customerLogin = await authorize_customer_login(customerConnection, {
    body: {
      email: customerJoin.email,
      password: "CustomerPass123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null, // ip is required for customer login (ip: ... | null)
    } satisfies IShoppingMallCustomer.ILogin,
  });
  typia.assert(customerLogin);
  // 3. Customer creates a refund request
  // Note: The generation function handles prerequisite setup:
  // - Seller creating product and variant
  // - Customer adding to cart and placing order
  // - Seller creating shipment and confirming delivery
  // - Order item status transitioning to DELIVERED
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {},
    );
  typia.assert(refundRequest);
  // Verify refund request is in PENDING status initially
  TestValidator.equals(
    "refund request status is PENDING",
    refundRequest.status,
    "PENDING",
  );
  TestValidator.predicate(
    "responded_by_seller_id is null initially",
    refundRequest.responded_by_seller_id === null,
  );
  TestValidator.predicate(
    "responded_at is null initially",
    refundRequest.responded_at === null,
  );
  TestValidator.predicate(
    "respondedBySeller is null initially",
    refundRequest.respondedBySeller === null,
  );
  // 4. Seller approves the refund request
  const updatedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "APPROVED",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(updatedRefundRequest);
  // 5. Validate refund request approval
  TestValidator.equals(
    "refund request status is APPROVED",
    updatedRefundRequest.status,
    "APPROVED",
  );
  TestValidator.equals(
    "responded_by_seller_id matches seller",
    updatedRefundRequest.responded_by_seller_id,
    sellerLogin.id,
  );
  TestValidator.predicate(
    "responded_at is populated after approval",
    updatedRefundRequest.responded_at !== null,
  );
  TestValidator.predicate(
    "responded_at is after requested_at",
    updatedRefundRequest.responded_at! > updatedRefundRequest.requested_at,
  );
  // 6. Validate order item status changed to REFUNDED
  TestValidator.equals(
    "order item status is REFUNDED after approval",
    updatedRefundRequest.orderItem.status,
    "REFUNDED",
  );
  // 7. Verify seller information is included in response
  TestValidator.predicate(
    "respondedBySeller is populated",
    updatedRefundRequest.respondedBySeller !== null,
  );
  TestValidator.equals(
    "responded seller ID matches",
    updatedRefundRequest.respondedBySeller!.id,
    sellerLogin.id,
  );
  TestValidator.equals(
    "responded seller shop name matches",
    updatedRefundRequest.respondedBySeller!.shop_name,
    sellerLogin.shop_name,
  );
  // 8. Verify customer information is preserved
  TestValidator.equals(
    "customer ID matches",
    updatedRefundRequest.customer.id,
    customerLogin.id,
  );
  TestValidator.equals(
    "customer email matches",
    updatedRefundRequest.customer.email,
    customerLogin.email,
  );
  // 9. Verify order item information is preserved
  TestValidator.equals(
    "order item ID matches",
    updatedRefundRequest.orderItem.id,
    refundRequest.orderItem.id,
  );
  TestValidator.predicate(
    "order item quantity is positive",
    updatedRefundRequest.orderItem.quantity > 0,
  );
  TestValidator.predicate(
    "order item unit price is positive",
    updatedRefundRequest.orderItem.unit_price > 0,
  );
}
