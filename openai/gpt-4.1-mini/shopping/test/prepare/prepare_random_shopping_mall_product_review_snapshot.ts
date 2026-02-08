import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_product_review_snapshot(
  input?: DeepPartial<IShoppingMallProductReviewSnapshot.ICreate> | undefined,
): IShoppingMallProductReviewSnapshot.ICreate {
  input;
  return {};
}
