import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_approval } from "../prepare/prepare_random_shopping_mall_seller_approval";

export async function generate_random_shopping_mall_administrator_seller_approvals_create_seller_approval(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerApproval.ICreate> | undefined;
  },
): Promise<IShoppingMallSellerApproval> {
  const prepared: IShoppingMallSellerApproval.ICreate =
    prepare_random_shopping_mall_seller_approval(props.body);
  const result: IShoppingMallSellerApproval =
    await api.functional.shoppingMall.administrator.sellerApprovals.createSellerApproval(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
