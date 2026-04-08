import { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce review creation data for E2E testing.
 *
 * Generates a complete IEcommerceReview.ICreate with randomized values for testing
 * the product review functionality. The review includes a required order item reference,
 * a star rating from 1-5, and optional text content describing the customer's experience.
 *
 * This function supports test customization through the input parameter, allowing
 * specific values to be overridden while auto-generating remaining fields.
 */
export function prepare_random_ecommerce_review(
  input?: DeepPartial<IEcommerceReview.ICreate> | undefined,
): IEcommerceReview.ICreate {
  return {
    orderItemId:
      input?.orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content:
      input?.content ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
      }),
  };
}
