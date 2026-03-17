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
 * Test that a seller cannot respond to a refund request that has already been responded to.
 *
 * This test validates the business rule that only PENDING refund requests can be updated.
 * Once a seller has responded (APPROVED or REJECTED), the refund request cannot be modified.
 *
 * Test Flow:
 * 1. Seller creates product with variant
 * 2. Customer places order (using generation function which handles cart/address internally)
 * 3. Customer submits refund request for delivered order item
 * 4. Seller approves refund request (first response)
 * 5. Seller attempts to respond again - should fail with error
 * 6. Verify refund request status remains APPROVED
 */
export async function test_api_refund_request_already_responded(
  connection: api.IConnection,
): Promise<void> {
  // =========================================================================
  // PHASE 1: Seller Setup - Register and Create Product
  // =========================================================================
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // Create product - generation function handles category creation internally
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      },
    },
  );
  typia.assert(product);
  // Create product variant with stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          stock_quantity: 100,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          options: [
            {
              key: "color",
              value: RandomGenerator.pick(["Red", "Blue", "Green"] as const),
            },
            {
              key: "size",
              value: RandomGenerator.pick(["S", "M", "L"] as const),
            },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // =========================================================================
  // PHASE 2: Customer Setup - Register and Place Order
  // =========================================================================
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      nickname: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // Place order - generation function handles cart and address internally
  const order = await generate_random_shopping_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Verify order has items
  TestValidator.predicate("order has items", () => order.items.length > 0);
  const targetOrderItem = order.items[0]!;
  // =========================================================================
  // PHASE 3: Customer Creates Refund Request
  // =========================================================================
  // The generation function validates that order item is DELIVERED
  const refundRequest =
    await generate_random_shopping_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: targetOrderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // Verify refund request is in PENDING status
  TestValidator.equals(
    "refund request status is PENDING",
    refundRequest.status,
    "PENDING",
  );
  TestValidator.equals(
    "refund request order item",
    refundRequest.order_item_id,
    targetOrderItem.id,
  );
  TestValidator.predicate(
    "responded_by_seller_id is null",
    () => refundRequest.responded_by_seller_id === null,
  );
  TestValidator.predicate(
    "responded_at is null",
    () => refundRequest.responded_at === null,
  );
  // =========================================================================
  // PHASE 4: Seller Approves Refund Request (First Response)
  // =========================================================================
  // Login as seller to respond to refund request
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: "Test1234!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    } satisfies IShoppingMallSeller.ILogin,
  });
  // Seller approves the refund request
  const approvedRefundRequest =
    await api.functional.shoppingMall.seller.refund_requests.update(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "APPROVED",
        } satisfies IShoppingMallRefundRequest.IUpdate,
      },
    );
  typia.assert(approvedRefundRequest);
  // Verify approval was successful
  TestValidator.equals(
    "refund request status after approval",
    approvedRefundRequest.status,
    "APPROVED",
  );
  TestValidator.predicate(
    "responded_by_seller_id is set",
    () => approvedRefundRequest.responded_by_seller_id !== null,
  );
  TestValidator.predicate(
    "responded_at is set",
    () => approvedRefundRequest.responded_at !== null,
  );
  // =========================================================================
  // PHASE 5: Seller Attempts Second Response - Should Fail
  // =========================================================================
  // Seller tries to respond again with REJECTED status - should throw error
  await TestValidator.error(
    "seller cannot respond to already approved refund request with REJECTED",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.update(
        sellerConnection,
        {
          refundRequestId: refundRequest.id,
          body: {
            status: "REJECTED",
          } satisfies IShoppingMallRefundRequest.IUpdate,
        },
      );
    },
  );
  // Seller tries to approve again - should also throw error
  await TestValidator.error(
    "seller cannot approve already approved refund request again",
    async () => {
      await api.functional.shoppingMall.seller.refund_requests.update(
        sellerConnection,
        {
          refundRequestId: refundRequest.id,
          body: {
            status: "APPROVED",
          } satisfies IShoppingMallRefundRequest.IUpdate,
        },
      );
    },
  );
  // =========================================================================
  // PHASE 6: Verify Original State Remains Unchanged
  // =========================================================================
  // The approvedRefundRequest should still show APPROVED status
  TestValidator.equals(
    "refund request status remains APPROVED after failed update attempts",
    approvedRefundRequest.status,
    "APPROVED",
  );
  TestValidator.equals(
    "responded_by_seller_id unchanged",
    approvedRefundRequest.responded_by_seller_id,
    seller.id,
  );
  // Verify the refund request structure is intact
  TestValidator.equals(
    "order_item_id unchanged",
    approvedRefundRequest.order_item_id,
    targetOrderItem.id,
  );
  TestValidator.equals(
    "customer_id unchanged",
    approvedRefundRequest.customer_id,
    customer.id,
  );
}
