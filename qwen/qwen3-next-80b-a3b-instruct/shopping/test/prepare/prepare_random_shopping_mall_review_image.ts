import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewImage";
export function prepare_random_shopping_mall_review_image(
  input?: DeepPartial<IShoppingMallReviewImage.ICreate>,
): IShoppingMallReviewImage.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
    extension:
      input?.extension ??
      RandomGenerator.pick(["jpg", "jpeg", "png", "gif", "webp"] as const),
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
  };
}
