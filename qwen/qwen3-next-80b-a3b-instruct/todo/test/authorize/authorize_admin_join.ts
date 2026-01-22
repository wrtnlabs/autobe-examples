import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body: ITodoListAdmin.IJoin;
  },
): Promise<ITodoListAdmin.IAuthorized> {
  const joinInput = {
    email:
      props.body?.email ??
      `admin-${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
  } satisfies ITodoListAdmin.IJoin;
  return await api.functional.auth.admin.join(connection, { body: joinInput });
}
