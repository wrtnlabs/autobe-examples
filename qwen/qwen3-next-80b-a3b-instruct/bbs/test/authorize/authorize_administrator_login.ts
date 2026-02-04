import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_administrator_login(
  connection: api.IConnection,
  props: {
    body: IEconomicDiscussionAdministrator.ILogin;
  },
): Promise<IEconomicDiscussionAdministrator.IAuthorized> {
  const loginInput = {
    email: props.body.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicDiscussionAdministrator.ILogin;
  return await api.functional.economicDiscussion.auth.administrator.login(
    connection,
    { body: loginInput },
  );
}
