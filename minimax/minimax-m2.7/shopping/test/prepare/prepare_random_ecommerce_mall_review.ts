import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_review(
  input?: DeepPartial<IEcommerceMallReview.ICreate>,
): IEcommerceMallReview.ICreate {
  return {
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    content:
      input?.content ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 2,
        sentenceMax: 5,
        wordMin: 3,
        wordMax: 10,
      }),
  };
}
