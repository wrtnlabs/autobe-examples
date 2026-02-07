import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_user_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomyPoliticsBoardUser.IJoin>;
  },
): Promise<IEconomyPoliticsBoardUser.IAuthorized> {
  return await api.functional.economyPoliticsBoard.auth.user.join(connection, {
    body: props.body ?? ({} as IEconomyPoliticsBoardUser.IJoin),
  });
}
