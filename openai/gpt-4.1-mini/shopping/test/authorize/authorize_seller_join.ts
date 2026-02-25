import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_seller_join(
  connection: api.IConnection,
  props: {
    body: Partial<IShoppingMallSeller.IJoin>;
  },
): Promise<IShoppingMallSeller.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    shopName: props.body?.shopName ?? RandomGenerator.name(1),
    shopDescription: props.body?.shopDescription ?? null,
    logoUri: props.body?.logoUri ?? null,
  } satisfies IShoppingMallSeller.IJoin;
  return await api.functional.shoppingMall.auth.seller.join(connection, {
    body: joinInput,
  });
}
