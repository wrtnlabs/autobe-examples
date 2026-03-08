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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_todo_app_member_password_resets_request_reset } from "../../../generate/generate_random_todo_app_member_password_resets_request_reset";
import { prepare_random_todo_app_member_password_reset } from "../../../prepare/prepare_random_todo_app_member_password_reset";

export async function test_api_password_reset_token_status_other_user_forbidden(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member account
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstMember);
  // 2. Create password reset token for first member
  const resetResponse: ITodoAppMemberPasswordReset.ICreated =
    await api.functional.todoApp.member.password_resets.requestReset(
      firstMemberConnection,
      {
        body: {
          email: firstMember.email,
        },
      },
    );
  typia.assert(resetResponse);
  // 3. Create second member account
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(secondMember);
  // 4. Second member attempts to get status of first member's token
  await TestValidator.error(
    "second member cannot access first member's password reset token",
    async () => {
      await api.functional.todoApp.member.password_resets.at(
        secondMemberConnection,
        {
          resetId: resetResponse.id,
        },
      );
    },
  );
  // 5. Verify unauthorized member cannot access any password reset tokens
  const randomTokenId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "second member cannot access arbitrary password reset token",
    async () => {
      await api.functional.todoApp.member.password_resets.at(
        secondMemberConnection,
        {
          resetId: randomTokenId,
        },
      );
    },
  );
}
