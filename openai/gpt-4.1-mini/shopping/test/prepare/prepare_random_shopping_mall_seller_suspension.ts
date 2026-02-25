import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_suspension(
  input?: DeepPartial<IShoppingMallSellerSuspension.ICreate>,
): IShoppingMallSellerSuspension.ICreate {
  return {
    seller_id: input?.seller_id ?? typia.random<string & tags.Format<"uuid">>(),
    suspension_reason:
      input?.suspension_reason ?? RandomGenerator.paragraph({ sentences: 1 }),
  };
}
