import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform review creation data for E2E testing.
 *
 * Generates a complete IMallPlatformReview.ICreate payload with valid UUID
 * identifiers, a bounded star rating, and optional review content. Any provided
 * DeepPartial overrides are preserved, and explicit null content is respected.
 */
export function prepare_random_mall_platform_review(
  input?: DeepPartial<IMallPlatformReview.ICreate> | undefined,
): IMallPlatformReview.ICreate {
  return {
    orderItemId:
      input?.orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
    productId: input?.productId ?? typia.random<string & tags.Format<"uuid">>(),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content:
      input?.content !== undefined
        ? input.content
        : RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 1,
            sentenceMax: 3,
          }),
  };
}
