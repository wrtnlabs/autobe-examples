import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_profile_snapshot(
  input?: DeepPartial<IShoppingMallSellerProfileSnapshot.ICreate>,
): IShoppingMallSellerProfileSnapshot.ICreate {
  return {
    shopName: input?.shopName ?? RandomGenerator.name(2),
    shopDescription:
      input?.shopDescription !== undefined
        ? input.shopDescription
        : RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 2,
            sentenceMax: 5,
          }),
    logoUri:
      input?.logoUri !== undefined
        ? input.logoUri
        : typia.random<string & tags.Format<"uri">>(),
    changedSummary:
      input?.changedSummary ??
      RandomGenerator.paragraph({ sentences: 4, wordMin: 3, wordMax: 8 }),
    changedAt:
      input?.changedAt ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
