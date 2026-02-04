import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
export async function authorize_customer_join(
  connection: api.IConnection,
  props: {
    body: IShoppingMallCustomer.IJoin;
  },
): Promise<IShoppingMallCustomer.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@example.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    ip: props.body?.ip ?? null,
    href: props.body?.href ?? `https://${RandomGenerator.alphaNumeric(12)}.com`,
    referrer:
      props.body?.referrer ??
      `https://${RandomGenerator.alphaNumeric(10)}.com/referral`,
  } satisfies IShoppingMallCustomer.IJoin;
  return await api.functional.shoppingMall.auth.customer.join(connection, {
    body: joinInput,
  });
}
