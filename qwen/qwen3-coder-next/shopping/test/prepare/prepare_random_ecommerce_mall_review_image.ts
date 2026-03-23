import { IEcommerceMallReviewImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReviewImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_review_image(
  input?: DeepPartial<IEcommerceMallReviewImage.ICreate> | undefined,
): IEcommerceMallReviewImage.ICreate {
  return {
    image_url:
      input?.image_url ??
      RandomGenerator.paragraph({ sentences: 1, wordMin: 10, wordMax: 20 }),
  };
}
