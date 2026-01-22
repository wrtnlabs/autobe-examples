import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserEmailVerification";
export function prepare_random_todo_app_user_email_verification(
  input?: DeepPartial<ITodoAppUserEmailVerification.ICreate>,
): ITodoAppUserEmailVerification.ICreate {
  const token: string = input?.token ?? RandomGenerator.alphaNumeric(32);
  const token_expired_at: string & tags.Format<"date-time"> =
    input?.token_expired_at ?? new Date(Date.now() + 3600 * 1000).toISOString();
  const verified_at: (string & tags.Format<"date-time">) | null | undefined =
    input?.verified_at !== undefined ? input.verified_at : null;
  return {
    token,
    token_expired_at,
    verified_at,
  };
}
