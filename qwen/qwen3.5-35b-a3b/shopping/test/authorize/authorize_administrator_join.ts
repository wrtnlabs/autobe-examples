import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_administrator_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdministrator.IJoin>;
  },
): Promise<IEcommerceMallAdministrator.IAuthorized> {
  const joinInput = {
    display_name: props.body?.display_name ?? RandomGenerator.name(2),
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    grade: props.body?.grade ?? ("regular" as const),
  } satisfies IEcommerceMallAdministrator.IJoin;
  return await api.functional.ecommerceMall.auth.administrator.join(
    connection,
    { body: joinInput },
  );
}
