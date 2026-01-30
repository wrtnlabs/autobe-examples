import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserPasswordReset";
export function prepare_random_todo_app_user_password_reset(
  input?: DeepPartial<ITodoAppUserPasswordReset.ICreate>,
): ITodoAppUserPasswordReset.ICreate {
  return {
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
    expires_at:
      input?.expires_at ?? new Date(Date.now() + 86400000).toISOString(),
    requested_at:
      input?.requested_at ?? new Date(Date.now() - 86400000).toISOString(),
  };
}
