import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: IAdmin.IJoin;
  },
): Promise<IAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? `${RandomGenerator.alphaNumeric(8)}@wrtn.io`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies IAdmin.IJoin;
  return await api.functional.auth.admin.join(connection, { body: joinInput });
}
