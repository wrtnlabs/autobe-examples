import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_seller_approval_request(
  input?: DeepPartial<IShoppingMallSellerApprovalRequest.ICreate>,
): IShoppingMallSellerApprovalRequest.ICreate {
  return {
    reason:
      input?.reason !== undefined
        ? input.reason
        : RandomGenerator.pick([
            RandomGenerator.paragraph({ sentences: 3 }),
            null,
          ] as const),
  };
}
