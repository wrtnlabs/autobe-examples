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
    text_content:
      input?.text_content ??
      (Math.random() > 0.3
        ? RandomGenerator.paragraph({ sentences: 3 })
        : null),
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
