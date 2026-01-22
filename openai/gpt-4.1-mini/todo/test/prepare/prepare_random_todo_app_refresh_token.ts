import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppRefreshToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppRefreshToken";
export function prepare_random_todo_app_refresh_token(
  input?: DeepPartial<ITodoAppRefreshToken.ICreate>,
): ITodoAppRefreshToken.ICreate {
  return {
    refresh_token: input?.refresh_token ?? RandomGenerator.alphaNumeric(64),
    user_id:
      input?.user_id !== undefined
        ? input.user_id
        : typia.random<boolean>()
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    user_session_id:
      input?.user_session_id !== undefined
        ? input.user_session_id
        : typia.random<boolean>()
          ? typia.random<string & tags.Format<"uuid">>()
          : null,
    expired_at:
      input?.expired_at ??
      RandomGenerator.date(new Date(), 1000 * 60 * 60 * 24 * 30).toISOString(),
  };
}
