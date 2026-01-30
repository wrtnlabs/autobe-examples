import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumUser";
export async function authorize_user_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEconomicForumUser.IJoin>;
  },
): Promise<IEconomicForumUser.IAuthorized> {
  const joinInput: IEconomicForumUser.IJoin = {};
  return await api.functional.economicForum.auth.user.join(connection, {
    body: joinInput,
  });
}
