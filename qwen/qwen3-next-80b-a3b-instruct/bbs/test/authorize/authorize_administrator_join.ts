import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_administrator_join(
  connection: api.IConnection,
  props: {
    body: IEconomicDiscussionAdministrator.IJoin;
  },
): Promise<IEconomicDiscussionAdministrator.IAuthorized> {
  const joinInput = {
    email: props.body.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body.password ?? RandomGenerator.alphaNumeric(16),
    ip: props.body.ip ?? null,
    href: props.body.href ?? `https://${RandomGenerator.alphaNumeric(12)}.com`,
    referrer:
      props.body.referrer ?? `https://${RandomGenerator.alphaNumeric(10)}.org`,
  } satisfies IEconomicDiscussionAdministrator.IJoin;
  return await api.functional.economicDiscussion.auth.administrator.join(
    connection,
    { body: joinInput },
  );
}
