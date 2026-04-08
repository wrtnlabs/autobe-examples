import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import type { IEcommerceMallCustomerReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReviewSnapshot";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_orders_items_reviews_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_items_reviews_create";
import { prepare_random_ecommerce_mall_customer_review } from "../../../prepare/prepare_random_ecommerce_mall_customer_review";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";

/**
 * Test duplicate review prevention for the same product in the same order.
 *
 * Validates that the system enforces the business rule of allowing only one review per product per order.
 * After customer registration and order creation, the test verifies that the first review can be
 * successfully created, while attempting a second review for the same product in the same order
 * returns a 409 Conflict error with the message "Review already exists for this product in this order".
 * This ensures authentic feedback from verified purchasers while preventing spam and duplicate reviews.
 */
export async function test_api_product_review_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerConnection, {
      body: typia.random<IEcommerceMallMember.IJoin>(),
    });
  typia.assert(customer);
  // 2. Create order with delivered item
  const order: IEcommerceMallOrder =
    await generate_random_ecommerce_mall_member_orders_create(
      customerConnection,
      {
        body: typia.random<DeepPartial<IEcommerceMallOrder.ICreate>>(),
      },
    );
  typia.assert(order);
  // 3. Create first review (item should be delivered)
  const item = order.items[0];
  const firstReview: IEcommerceMallCustomerReview =
    await generate_random_ecommerce_mall_member_orders_items_reviews_create(
      customerConnection,
      {
        body: {
          rating: 5,
          text: "First review",
        },
        params: {
          orderId: order.id,
          itemId: item.id,
        },
      },
    );
  typia.assert(firstReview);
  // 4. Attempt second review - should return 409 Conflict
  await TestValidator.httpError(
    "duplicate review prevention - same product in same order",
    [409],
    async () => {
      await generate_random_ecommerce_mall_member_orders_items_reviews_create(
        customerConnection,
        {
          body: {
            rating: 4,
            text: "Second review attempt (should fail)",
          },
          params: {
            orderId: order.id,
            itemId: item.id,
          },
        },
      );
    },
  );
}
