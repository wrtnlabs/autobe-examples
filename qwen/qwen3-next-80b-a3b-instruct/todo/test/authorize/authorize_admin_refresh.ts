import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
export async function authorize_admin_refresh(
  connection: api.IConnection,
  props: {
    body: ITodoListAdmin.IRefresh;
  },
): Promise<ITodoListAdmin.IAuthorized> {
  return await api.functional.auth.admin.refresh(connection, {
    body: props.body,
  });
}
