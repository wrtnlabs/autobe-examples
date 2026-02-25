import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_approval(
  input?: DeepPartial<IShoppingMallSellerApproval.ICreate>,
): IShoppingMallSellerApproval.ICreate {
  const status =
    input?.status ??
    RandomGenerator.pick(["pending", "approved", "rejected"] as const);
  return {
    shoppingMallSellerId:
      input?.shoppingMallSellerId ??
      typia.random<string & tags.Format<"uuid">>(),
    status: status,
    rejectionReason:
      input?.rejectionReason !== undefined
        ? input.rejectionReason
        : status === "rejected"
          ? RandomGenerator.paragraph({ sentences: 2 })
          : null,
  };
}
