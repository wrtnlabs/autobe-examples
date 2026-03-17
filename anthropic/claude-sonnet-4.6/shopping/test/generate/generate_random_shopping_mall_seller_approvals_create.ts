import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApproval";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_approval } from "../prepare/prepare_random_shopping_mall_seller_approval";

export async function generate_random_shopping_mall_seller_approvals_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerApproval.ICreate> | undefined;
  },
): Promise<IShoppingMallSellerApproval> {
  const prepared: IShoppingMallSellerApproval.ICreate =
    prepare_random_shopping_mall_seller_approval(props.body);
  return await api.functional.shoppingMall.seller.approvals.create(connection, {
    body: prepared,
  });
}
