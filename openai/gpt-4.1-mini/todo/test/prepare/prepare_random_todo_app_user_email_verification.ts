import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
export function prepare_random_todo_app_user_email_verification(
  input?: DeepPartial<ITodoAppUserEmailVerification.ICreate>,
): ITodoAppUserEmailVerification.ICreate {
  return {
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
    token_expired_at: input?.token_expired_at ?? null,
    verified_at: input?.verified_at ?? null,
    created_at: input?.created_at ?? new Date().toISOString(),
    deleted_at: input?.deleted_at ?? null,
  };
}
