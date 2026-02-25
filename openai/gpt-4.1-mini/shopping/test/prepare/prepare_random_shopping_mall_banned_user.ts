import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_banned_user(
  input?: DeepPartial<IShoppingMallBannedUser.ICreate>,
): IShoppingMallBannedUser.ICreate {
  return {
    shoppingMallCustomerId:
      input?.shoppingMallCustomerId ??
      (input?.shoppingMallSellerId
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    shoppingMallSellerId:
      input?.shoppingMallSellerId ??
      (input?.shoppingMallCustomerId
        ? null
        : typia.random<string & tags.Format<"uuid">>()),
    banReason: input?.banReason ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
