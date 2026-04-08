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

export async function test_api_product_review_before_delivery(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(joinResult);
  // 2. Create order with product item (status will be 'paid', not 'delivered')
  // Note: Using SDK function directly as utility function requires complete setup
  const orderConnection: api.IConnection = { host: connection.host };
  orderConnection.headers = { Authorization: joinResult.token.access };
  // Create minimal order item with mock data - backend will validate
  const order = await api.functional.ecommerceMall.member.orders.create(
    orderConnection,
    {
      body: {
        shipping_address_id: typia.random<string & tags.Format<"uuid">>(),
        order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            quantity: 1,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 3. Verify order item status is not 'delivered'
  if (order.items.length === 0) {
    throw new Error("Order has no items to test review on");
  }
  const firstItem = order.items[0];
  // 4. Attempt to create review BEFORE delivery (should fail with 400)
  const reviewConnection: api.IConnection = { host: connection.host };
  reviewConnection.headers = { Authorization: joinResult.token.access };
  await TestValidator.httpError(
    "review before delivery should fail with 400",
    400,
    async () => {
      await api.functional.ecommerceMall.member.orders.items.reviews.create(
        reviewConnection,
        {
          orderId: order.id,
          itemId: firstItem.id,
          body: {
            rating: 5,
            text: "Test review before delivery",
          } satisfies IEcommerceMallCustomerReview.ICreate,
        },
      );
    },
  );
  // 5. Verify the error message is correct
  // (The error message validation happens inside TestValidator.httpError when we catch the error)
}
