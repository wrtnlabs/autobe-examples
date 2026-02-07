import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomyPoliticsBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomyPoliticsBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomyPoliticsBoardAdmin.IJoin>;
  },
): Promise<IEconomyPoliticsBoardAdmin.IAuthorized> {
  const joinInput = {
    email:
      props.body?.email ?? (typia.random<string>() satisfies string & tags.Format<"email">),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? (typia.random<string>() satisfies string & tags.Format<"uri">),
    referrer:
      props.body?.referrer ?? (typia.random<string>() satisfies string & tags.Format<"uri">),
    ip: props.body?.ip ?? (typia.random<string>() satisfies string & tags.Format<"ipv4">),
  } satisfies IEconomyPoliticsBoardAdmin.IJoin;
  return await api.functional.economyPoliticsBoard.auth.admin.join(connection, {
    body: joinInput,
  });
}