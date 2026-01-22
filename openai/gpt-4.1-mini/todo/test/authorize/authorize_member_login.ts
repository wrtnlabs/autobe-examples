import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import type { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
import type { ITodoAppTodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItem";
import type { ITodoAppTodoItemAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoItemAuditLog";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
import type { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
import type { ITodoAppUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserRole";
import type { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
export async function authorize_member_login(
  connection: api.IConnection,
  props: {
    body: ITodoAppUser.ILogin;
  },
): Promise<ITodoAppUser.IAuthorized> {
  return await api.functional.auth.user.login(connection, { body: props.body });
}
