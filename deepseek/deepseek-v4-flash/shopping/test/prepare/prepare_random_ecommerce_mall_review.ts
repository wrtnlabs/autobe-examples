import { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall review creation data for E2E testing.
 *
 * Generates a complete IECommerceMallReview.ICreate with randomized values.
 * The customer must provide the identifier of the delivered order item they
 * wish to review, a star rating between 1 and 5 (required), and optionally
 * a text description with detailed feedback.
 *
 * @param input Partial input to override specific generated values
 * @returns A complete IECommerceMallReview.ICreate with all properties populated
 */
export function prepare_random_ecommerce_mall_review(
  input?: DeepPartial<IECommerceMallReview.ICreate> | undefined,
): IECommerceMallReview.ICreate {
  return {
    order_item_id:
      input?.order_item_id ?? typia.random<string & tags.Format<"uuid">>(),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content:
      input?.content !== undefined
        ? (input.content ?? null)
        : RandomGenerator.content({ paragraphs: 1 }),
  };
}
