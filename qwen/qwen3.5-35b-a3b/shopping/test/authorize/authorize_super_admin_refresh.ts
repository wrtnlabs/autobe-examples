import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_admin_refresh(
  connection: api.IConnection,
  props: {
    body: IEcommerceMallSuperAdmin.IRefresh;
  },
): Promise<IEcommerceMallSuperAdmin.IAuthorized> {
  return await api.functional.ecommerceMall.auth.superAdmin.refresh(
    connection,
    {
      body: props.body,
    },
  );
}
