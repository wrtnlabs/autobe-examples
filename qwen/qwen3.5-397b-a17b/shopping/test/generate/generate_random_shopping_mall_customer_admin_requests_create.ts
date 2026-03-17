import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_admin_request } from "../prepare/prepare_random_shopping_mall_admin_request";

export async function generate_random_shopping_mall_customer_admin_requests_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdminRequest.ICreate>;
  },
): Promise<IShoppingMallAdminRequest> {
  const prepared: IShoppingMallAdminRequest.ICreate =
    prepare_random_shopping_mall_admin_request(props.body);
  const result: IShoppingMallAdminRequest =
    await api.functional.shoppingMall.customer.admin_requests.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
