import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductReview";
export function prepare_random_community_platform_product_review(
  input?: DeepPartial<ICommunityPlatformProductReview.ICreate>,
): ICommunityPlatformProductReview.ICreate {
  return {
    productId: input?.productId ?? RandomGenerator.alphaNumeric(12),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 3, wordMax: 8 }),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 3,
        sentenceMax: 8,
        wordMin: 4,
        wordMax: 10,
      }),
  };
}
