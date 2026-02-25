import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function authorize_user_login(
  connection: api.IConnection,
  props: {
    body: IEconomicPoliticalDiscussionBoardUser.ILogin;
  },
): Promise<IEconomicPoliticalDiscussionBoardUser.IAuthorized> {
  return await api.functional.economicPoliticalDiscussionBoard.auth.user.login(
    connection,
    {
      body: props.body,
    },
  );
}
