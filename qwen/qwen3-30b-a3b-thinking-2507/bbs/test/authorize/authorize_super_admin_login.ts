import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_admin_login(
  connection: api.IConnection,
  props: {
    body: IEconomyPoliticsBoardSuperAdmin.ILogin;
  },
): Promise<IEconomyPoliticsBoardSuperAdmin.IAuthorized> {
  return await api.functional.economyPoliticsBoard.auth.superAdmin.login(
    connection,
    {
      body: props.body,
    },
  );
}
