import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_review_snapshot(
  input?: DeepPartial<IShoppingMallReviewSnapshot.ICreate>,
): IShoppingMallReviewSnapshot.ICreate {
  return {
    shoppingMallProductReviewId:
      input?.shoppingMallProductReviewId ??
      typia.random<string & tags.Format<"uuid">>(),
    rating:
      input?.rating ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >(),
    body: input?.body ?? null,
    snapshotCreatedAt:
      input?.snapshotCreatedAt ??
      typia.random<string & tags.Format<"date-time">>(),
    createdAt:
      input?.createdAt ?? typia.random<string & tags.Format<"date-time">>(),
    updatedAt:
      input?.updatedAt ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
