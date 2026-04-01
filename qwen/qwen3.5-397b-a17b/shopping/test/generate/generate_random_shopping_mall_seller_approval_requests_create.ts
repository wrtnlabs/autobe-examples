import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerApprovalRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_seller_approval_request } from "../prepare/prepare_random_shopping_mall_seller_approval_request";

export async function generate_random_shopping_mall_seller_approval_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSellerApprovalRequest.ICreate> | undefined;
  },
): Promise<IShoppingMallSellerApprovalRequest> {
  const prepared: IShoppingMallSellerApprovalRequest.ICreate =
    prepare_random_shopping_mall_seller_approval_request(props.body);
  const result: IShoppingMallSellerApprovalRequest =
    await api.functional.shoppingMall.seller.approval_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
