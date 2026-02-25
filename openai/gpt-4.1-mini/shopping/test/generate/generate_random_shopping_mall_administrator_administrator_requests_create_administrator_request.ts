import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_administrator_request } from "../prepare/prepare_random_shopping_mall_administrator_request";

export async function generate_random_shopping_mall_administrator_administrator_requests_create_administrator_request(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdministratorRequest.ICreate>;
  },
): Promise<IShoppingMallAdministratorRequest> {
  const prepared: IShoppingMallAdministratorRequest.ICreate =
    prepare_random_shopping_mall_administrator_request(props.body);
  const result: IShoppingMallAdministratorRequest =
    await api.functional.shoppingMall.administrator.administratorRequests.createAdministratorRequest(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
