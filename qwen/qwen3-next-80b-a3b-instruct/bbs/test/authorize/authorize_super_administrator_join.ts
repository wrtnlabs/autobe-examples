import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_administrator_join(
  connection: api.IConnection,
  props: {
    body: IEconomicBoardSuperAdministrator.IJoin;
  },
): Promise<IEconomicBoardSuperAdministrator.IAuthorized> {
  const joinInput = {
    // IEconomicBoardSuperAdministrator.IJoin is an empty object literal ({}), so no properties needed
  } satisfies IEconomicBoardSuperAdministrator.IJoin;
  return await api.functional.economicBoard.auth.superAdministrator.join(
    connection,
    { body: joinInput },
  );
}
