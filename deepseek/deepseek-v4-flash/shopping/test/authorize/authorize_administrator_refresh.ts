import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_administrator_refresh(
  connection: api.IConnection,
  props: {
    body: IECommerceMallAdministrator.IRefresh;
  },
): Promise<IECommerceMallAdministrator.IAuthorized> {
  return await api.functional.eCommerceMall.auth.administrator.refresh(
    connection,
    {
      body: props.body,
    },
  );
}
