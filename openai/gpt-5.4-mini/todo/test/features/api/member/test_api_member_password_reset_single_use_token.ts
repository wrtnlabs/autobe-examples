import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_todo_app_member_password_resets_process } from "../../../generate/generate_random_todo_app_member_password_resets_process";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

export async function test_api_member_password_reset_single_use_token(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joined = await api.functional.todoApp.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: true,
      } satisfies ITodoAppMember.IJoin,
    },
  );
  typia.assert(joined);
  const token = typia.random<string>();
  const resetResponse =
    await generate_random_todo_app_member_password_resets_process(
      memberConnection,
      {
        body: {
          token,
          password: true,
        } satisfies ITodoAppMemberPasswordReset.ICreate,
      },
    );
  typia.assert(resetResponse);
  TestValidator.equals(
    "reset member id should match joined member id",
    resetResponse.id,
    joined.id,
  );
  TestValidator.equals(
    "reset member email should match joined member email",
    resetResponse.email,
    joined.email,
  );
  TestValidator.equals(
    "new member record should remain active",
    resetResponse.deleted_at,
    null,
  );
  await TestValidator.error(
    "reusing the same reset token should fail",
    async () => {
      await generate_random_todo_app_member_password_resets_process(
        memberConnection,
        {
          body: {
            token,
            password: true,
          } satisfies ITodoAppMemberPasswordReset.ICreate,
        },
      );
    },
  );
}
