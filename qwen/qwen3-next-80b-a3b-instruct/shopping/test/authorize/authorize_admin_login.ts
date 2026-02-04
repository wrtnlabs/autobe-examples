import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
export async function authorize_admin_login(
  connection: api.IConnection,
  props: {
    body: IShoppingMallAdmin.ILogin;
  },
): Promise<IShoppingMallAdmin.IAuthorized> {
  const loginInput = {
    email:
      props.body?.email ??
      `${RandomGenerator.name(1).toLowerCase().replace(/\s/g, ".")}@wrtn.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallAdmin.ILogin;
  return await api.functional.shoppingMall.auth.admin.login.signIn(connection, {
    body: loginInput,
  });
}
