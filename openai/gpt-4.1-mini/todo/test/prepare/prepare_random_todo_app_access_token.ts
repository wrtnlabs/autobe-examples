import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
export function prepare_random_todo_app_access_token(
  input?: DeepPartial<ITodoAppAccessToken.ICreate>,
): ITodoAppAccessToken.ICreate {
  return {
    token: input?.token ?? RandomGenerator.alphaNumeric(40),
    type: input?.type ?? "bearer",
    issued_at:
      input?.issued_at ?? new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    expired_at:
      input?.expired_at ??
      new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    revoked_at:
      input?.revoked_at === undefined
        ? RandomGenerator.pick([
            null,
            new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          ])
        : input.revoked_at,
    todo_app_user_id:
      input?.todo_app_user_id === undefined
        ? RandomGenerator.pick([
            null,
            typia.random<string & tags.Format<"uuid">>(),
          ])
        : input.todo_app_user_id,
    todo_app_guest_id:
      input?.todo_app_guest_id === undefined
        ? RandomGenerator.pick([
            null,
            typia.random<string & tags.Format<"uuid">>(),
          ])
        : input.todo_app_guest_id,
    todo_app_user_session_id:
      input?.todo_app_user_session_id === undefined
        ? RandomGenerator.pick([
            null,
            typia.random<string & tags.Format<"uuid">>(),
          ])
        : input.todo_app_user_session_id,
  };
}
