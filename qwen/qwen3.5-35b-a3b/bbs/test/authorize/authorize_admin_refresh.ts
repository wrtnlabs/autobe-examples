import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_refresh(
  connection: api.IConnection,
  props: {
    body: IEconomicPoliticalBoardAdmin.IRefresh;
  },
): Promise<IEconomicPoliticalBoardAdmin.IAuthorized> {
  return await api.functional.economicPoliticalBoard.auth.admin.refresh(
    connection,
    {
      body: props.body,
    },
  );
}
