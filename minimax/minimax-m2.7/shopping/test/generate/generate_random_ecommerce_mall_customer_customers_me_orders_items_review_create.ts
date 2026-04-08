import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_review } from "../prepare/prepare_random_ecommerce_mall_review";

/**
 * Generate a random ecommerce mall review for a delivered order item via the API for E2E testing.
 *
 * Creates a product review attached to a specific order item that has 'delivered' status.
 * The review includes a star rating (1-5) and optional text content. Uses the prepare
 * function to generate valid random review data, then calls the creation endpoint.
 *
 * Prerequisites: The order item must exist and belong to the authenticated customer,
 * and the order item status must be 'delivered' before a review can be created.
 *
 * @param connection API connection context
 * @param props.review Optional DeepPartial override for review content and rating
 * @param props.params.itemId Required UUID of the order item to review
 * @returns The created review entity with customer, product, and orderItem relations
 */
export async function generate_random_ecommerce_mall_customer_customers_me_orders_items_review_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallReview.ICreate>;
    params: {
      itemId: string;
    };
  },
): Promise<IEcommerceMallReview> {
  const prepared: IEcommerceMallReview.ICreate =
    prepare_random_ecommerce_mall_review(props.body);
  const result: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.customers.me.orders.items.review.create(
      connection,
      {
        itemId: props.params.itemId,
        body: prepared,
      },
    );
  return result;
}
