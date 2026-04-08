import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce mall review creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallReview.ICreate with randomized values.
 * The rating is required and constrained to 1-5 stars. Content is optional
 * and can be null for ratings-only reviews.
 *
 * @param input Optional DeepPartial override for any property
 * @returns Complete IEcommerceMallReview.ICreate instance
 */
export function prepare_random_ecommerce_mall_review(
  input?: DeepPartial<IEcommerceMallReview.ICreate>,
): IEcommerceMallReview.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 5,
        wordMin: 3,
        wordMax: 10,
      }),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
  };
}
