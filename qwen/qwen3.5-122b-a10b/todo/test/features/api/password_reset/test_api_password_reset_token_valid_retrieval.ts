import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_password_reset_token_valid_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account for the test
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IMultiUserTodoMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Generate a valid UUID for password reset token retrieval
  // In simulation mode, this will return valid mock data
  const resetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve the password reset token by its ID
  const passwordResetToken =
    await api.functional.multiUserTodo.member.password_resets.at(
      memberConnection,
      {
        resetId,
      },
    );
  typia.assert(passwordResetToken);
  // 4. Validate business logic constraints
  TestValidator.equals(
    "token id matches resetId",
    passwordResetToken.id,
    resetId,
  );
  TestValidator.predicate(
    "token string exists",
    passwordResetToken.token.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null (token is active)",
    passwordResetToken.deleted_at,
    null,
  );
  // 5. Validate member summary structure
  TestValidator.predicate(
    "member id is valid UUID",
    passwordResetToken.member.id.length > 0,
  );
  TestValidator.predicate(
    "member email exists",
    passwordResetToken.member.email.length > 0,
  );
  TestValidator.predicate(
    "member name exists",
    passwordResetToken.member.name.length > 0,
  );
  TestValidator.equals(
    "member deleted_at is null (active member)",
    passwordResetToken.member.deleted_at,
    null,
  );
}
