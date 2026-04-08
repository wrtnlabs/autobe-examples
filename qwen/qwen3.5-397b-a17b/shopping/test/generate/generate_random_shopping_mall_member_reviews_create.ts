import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_review } from "../prepare/prepare_random_shopping_mall_review";

/**
 * Generate a random shopping mall review via the API for E2E testing.
 *
 * Prepares random review data using the prepare function, then calls the review creation endpoint.
 * The review is created for a delivered order item with a random rating between 1-5 stars and
 * optional content text. All reference IDs (product, order, order item) are auto-generated UUIDs.
 *
 * This function is designed for end-to-end test scenarios where a customer submits a product
 * review after receiving their order. The authentication is handled separately in test setups.
 *
 * @param connection - API connection information for the test server
 * @param props - Optional configuration with body customization
 * @param props.body - Partial review data to override random generation
 * @returns The created review entity with all fields including timestamps and references
 */
export async function generate_random_shopping_mall_member_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallReview.ICreate> | undefined;
  },
): Promise<IShoppingMallReview> {
  const prepared: IShoppingMallReview.ICreate =
    prepare_random_shopping_mall_review(props.body);
  const result: IShoppingMallReview =
    await api.functional.shoppingMall.member.reviews.create(connection, {
      body: prepared,
    });
  return result;
}
