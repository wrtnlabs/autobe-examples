import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_administrator_refresh(
  connection: api.IConnection,
  props: {
    body: IEconomicDiscussionAdministrator.IRefresh;
  },
): Promise<IEconomicDiscussionAdministrator.IAuthorized> {
  const refreshInput = {
    refresh_token: props.body.refresh_token ?? RandomGenerator.alphaNumeric(64),
  } satisfies IEconomicDiscussionAdministrator.IRefresh;
  return await api.functional.economicDiscussion.auth.administrator.refresh(
    connection,
    { body: refreshInput },
  );
}
