import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicForumAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumAdmin";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: IEconomicForumAdmin.IJoin;
  },
): Promise<IEconomicForumAdmin.IAuthorized> {
  const joinInput = {
    email:
      props.body?.email ??
      `${RandomGenerator.alphaNumeric(8)}@economicforum.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicForumAdmin.IJoin;
  return await api.functional.economicForum.auth.admin.join(connection, {
    body: joinInput,
  });
}
