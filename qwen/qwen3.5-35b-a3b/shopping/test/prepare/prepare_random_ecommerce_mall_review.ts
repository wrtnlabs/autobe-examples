import { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_review(
  input?: DeepPartial<IEcommerceMallReview.ICreate> | undefined,
): IEcommerceMallReview.ICreate {
  return {
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 2 }),
    body: input?.body ?? RandomGenerator.content({ paragraphs: 2 }),
    product_id:
      input?.product_id ?? typia.random<string & tags.Format<"uuid">>(),
    order_id: input?.order_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
