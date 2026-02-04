import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
export async function authorize_super_admin_refresh(
  connection: api.IConnection,
  props: {
    body: IShoppingMallSuperAdmin.IRefresh;
  },
): Promise<IShoppingMallSuperAdmin.IAuthorized> {
  return await api.functional.shoppingMall.auth.superAdmin.refresh(connection, {
    body: props.body,
  });
}
