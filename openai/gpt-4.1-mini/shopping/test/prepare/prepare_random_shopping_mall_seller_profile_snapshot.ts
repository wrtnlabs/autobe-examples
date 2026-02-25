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
    shoppingMallSellerId:
      input?.shoppingMallSellerId ??
      typia.random<string & tags.Format<"uuid">>(),
    shopName: input?.shopName ?? RandomGenerator.name(),
    shopDescription:
      input?.shopDescription ?? RandomGenerator.paragraph({ sentences: 2 }),
    logoImageUrl:
      input?.logoImageUrl !== undefined
        ? input.logoImageUrl
        : Math.random() < 0.5
          ? null
          : typia.random<string & tags.Format<"url">>(),
  };
}
