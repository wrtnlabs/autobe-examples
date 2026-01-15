import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: IShoppingMallAdmin.IJoin;
  },
): Promise<IShoppingMallAdmin.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
    href:
      props.body.href ??
      `https://example.com/admin/join-${RandomGenerator.alphaNumeric(6)}`,
    referrer:
      props.body.referrer ??
      `https://example.com/admin/signup-${RandomGenerator.alphaNumeric(6)}`,
  } satisfies IShoppingMallAdmin.IJoin;
  return await api.functional.auth.admin.join(connection, { body: joinInput });
}
