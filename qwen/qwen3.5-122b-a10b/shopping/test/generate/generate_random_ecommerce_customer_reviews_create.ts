import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_review } from "../prepare/prepare_random_ecommerce_review";

/**
 * Generate a random e-commerce customer review via the API for E2E testing.
 *
 * Prepares random review data using the prepare function, then calls the creation endpoint.
 * The review is attached to a specified order item and includes a star rating (1-5) and optional content.
 *
 * **Eligibility Requirements**
 *
 * The referenced order item must exist and have status "delivered". Each order item can have at most one review,
 * enforced by a unique constraint. If an order item already has a review, the API will return a 409 Conflict error.
 *
 * **Review Content**
 *
 * The rating field is required and must be an integer between 1 and 5 stars. The content field is optional and
 * can contain detailed feedback about the product experience. Reviews contribute to the product's average rating.
 *
 * **Permissions**
 *
 * Only authenticated customers can create reviews. The customer_id is automatically derived from the JWT session
 * token in the connection headers.
 *
 * @param connection - The HTTP connection to the API server
 * @param props - Generation parameters
 * @param props.body - Optional partial review data to customize the generated review
 * @returns The created review object with all fields including generated id and timestamps
 */
export async function generate_random_ecommerce_customer_reviews_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceReview.ICreate> | undefined;
  },
): Promise<IEcommerceReview> {
  const prepared: IEcommerceReview.ICreate = prepare_random_ecommerce_review(
    props.body,
  );
  const result: IEcommerceReview =
    await api.functional.ecommerce.customer.reviews.create(connection, {
      body: prepared,
    });
  return result;
}
