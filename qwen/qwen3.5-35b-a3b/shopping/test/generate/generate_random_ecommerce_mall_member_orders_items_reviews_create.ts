import api from "@ORGANIZATION/PROJECT-api";
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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_customer_review } from "../prepare/prepare_random_ecommerce_mall_customer_review";

/**
 * Generate a random customer product review via the API for E2E testing.
 *
 * Prepares random review data using the prepare function, then calls the creation endpoint with the specified order and item IDs. The review is created for a delivered order item and includes a randomized star rating (1-5) with optional text content.
 */
export async function generate_random_ecommerce_mall_member_orders_items_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCustomerReview.ICreate> | undefined;
    params: {
      orderId: string;
      itemId: string;
    };
  },
): Promise<IEcommerceMallCustomerReview> {
  const prepared: IEcommerceMallCustomerReview.ICreate =
    prepare_random_ecommerce_mall_customer_review(props.body);
  const result: IEcommerceMallCustomerReview =
    await api.functional.ecommerceMall.member.orders.items.reviews.create(
      connection,
      {
        body: prepared,
        orderId: props.params.orderId,
        itemId: props.params.itemId,
      },
    );
  return result;
}
