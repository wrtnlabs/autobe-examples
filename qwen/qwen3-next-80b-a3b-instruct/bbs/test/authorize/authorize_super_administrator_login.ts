import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_administrator_login(
  connection: api.IConnection,
  props: {
    body: IEconomicDiscussionSuperAdministrator.ILogin;
  },
): Promise<IEconomicDiscussionSuperAdministrator.IAuthorized> {
  const loginInput = {
    email: props.body.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicDiscussionSuperAdministrator.ILogin;
  return await api.functional.economicDiscussion.auth.superAdministrator.login(
    connection,
    { body: loginInput },
  );
}
