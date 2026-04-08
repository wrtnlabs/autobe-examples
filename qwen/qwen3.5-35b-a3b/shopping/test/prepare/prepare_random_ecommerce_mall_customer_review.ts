import { IEcommerceMallCustomerReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random customer product review data for E2E testing.
 *
 * Generates a complete IEcommerceMallCustomerReview.ICreate with randomized review data including a star rating (1-5) and optional written feedback content.
 */
export function prepare_random_ecommerce_mall_customer_review(
  input?: DeepPartial<IEcommerceMallCustomerReview.ICreate> | undefined,
): IEcommerceMallCustomerReview.ICreate {
  return {
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    text: input?.text ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
