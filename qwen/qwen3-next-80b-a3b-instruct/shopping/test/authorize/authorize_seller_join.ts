import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body: IShoppingMallSeller.IJoin;
  },
): Promise<IShoppingMallSeller.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  return await api.functional.shoppingMall.auth.seller.join(connection, {
    body: joinInput,
  });
}
