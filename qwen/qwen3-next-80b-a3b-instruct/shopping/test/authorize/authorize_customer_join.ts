import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomer.IJoin>;
  },
): Promise<IShoppingMallCustomer.IAuthorized> {
  const joinInput = {} satisfies IShoppingMallCustomer.IJoin;
  return await api.functional.shoppingMall.auth.customer.join(connection, {
    body: joinInput,
  });
}
