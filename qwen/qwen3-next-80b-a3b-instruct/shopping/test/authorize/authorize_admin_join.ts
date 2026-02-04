import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: IShoppingMallAdmin.IJoin;
  },
): Promise<IShoppingMallAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? "https://example.com/join",
    referrer: props.body?.referrer ?? "https://example.com",
    ip: props.body?.ip ?? "192.168.1.1",
  } satisfies IShoppingMallAdmin.IJoin;
  return await api.functional.shoppingMall.auth.admin.join(connection, {
    body: joinInput,
  });
}
