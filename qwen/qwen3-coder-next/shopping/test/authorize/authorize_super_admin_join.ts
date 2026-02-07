import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallSuperAdmin.IJoin>;
  },
): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  const joinInput = props.body ?? {};
  return await api.functional.shoppingMall.auth.super_admin.join(connection, {
    body: joinInput,
  });
}
