import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_refresh(
  connection: api.IConnection,
  props: {
    body: IEconPoliticBoardAdmin.IRefresh;
  },
): Promise<IEconPoliticBoardAdmin.IAuthorized> {
  const refreshToken =
    props.body?.refreshToken ?? RandomGenerator.alphaNumeric(100);
  return await api.functional.econPoliticBoard.auth.admin.refresh(connection, {
    body: { refreshToken },
  });
}
