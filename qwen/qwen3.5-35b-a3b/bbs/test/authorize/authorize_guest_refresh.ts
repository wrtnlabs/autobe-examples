import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_guest_refresh(
  connection: api.IConnection,
  props: {
    body: IEconomicPoliticalBoardGuest.IRefresh;
  },
): Promise<IEconomicPoliticalBoardGuest.IAuthorized> {
  return await api.functional.economicPoliticalBoard.auth.guest.refresh(
    connection,
    {
      body: props.body,
    },
  );
}
