import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_review } from "../prepare/prepare_random_ecommerce_mall_review";

/**
 * Generate a random e-commerce mall review via the API for E2E testing.
 *
 * Prepares random review creation data using the prepare function, then calls the
 * review creation endpoint. The generated review is associated with the authenticated
 * customer and the specified delivered order item.
 *
 * @param connection API connection with authentication
 * @param props Optional partial input to override specific generated values
 * @returns The newly created review with all fields
 */
export async function generate_random_e_commerce_mall_customer_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallReview.ICreate> | undefined;
  },
): Promise<IECommerceMallReview> {
  const prepared: IECommerceMallReview.ICreate =
    prepare_random_ecommerce_mall_review(props.body);
  return await api.functional.eCommerceMall.customer.reviews.create(
    connection,
    {
      body: prepared,
    },
  );
}
