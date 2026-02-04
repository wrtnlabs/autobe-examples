import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_super_administrator_join(
  connection: api.IConnection,
  props: {
    body: IEconomicDiscussionSuperAdministrator.IJoin;
  },
): Promise<IEconomicDiscussionSuperAdministrator.IAuthorized> {
  const joinInput = {
    email: props.body.email,
    password: props.body.password,
    display_name: props.body.display_name,
  } satisfies IEconomicDiscussionSuperAdministrator.IJoin;
  return await api.functional.economicDiscussion.auth.superAdministrator.join(
    connection,
    { body: joinInput },
  );
}
