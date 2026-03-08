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

export async function test_api_password_reset_token_status_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const joinConnection: api.IConnection = { host: connection.host };
  const registerEmail = typia.random<string & tags.Format<"email">>();
  const registerPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(joinConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset token (no authentication required)
  const resetResponse =
    await api.functional.todoApp.member.password_resets.requestReset(
      connection,
      {
        body: {
          email: registerEmail,
        } satisfies ITodoAppMemberPasswordReset.ICreate,
      },
    );
  typia.assert(resetResponse);
  // 3. Create authenticated connection for token status retrieval
  const statusConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(statusConnection, {
    body: {
      email: registerEmail,
      password: registerPassword,
    } satisfies ITodoAppMember.ILogin,
  });
  // 4. Retrieve token status
  const tokenStatus = await api.functional.todoApp.member.password_resets.at(
    statusConnection,
    {
      resetId: resetResponse.id,
    },
  );
  typia.assert(tokenStatus);
  // 5. Validate token status response structure
  TestValidator.equals("token id matches", tokenStatus.id, resetResponse.id);
  TestValidator.equals(
    "created_at preserved",
    tokenStatus.created_at,
    resetResponse.created_at,
  );
  TestValidator.predicate(
    "expires_at is future",
    tokenStatus.expires_at > new Date().toISOString(),
  );
  TestValidator.predicate(
    "isActive is true for valid token",
    tokenStatus.isActive === true,
  );
  // 6. Verify all required fields present
  TestValidator.predicate(
    "has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tokenStatus.id,
    ),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(tokenStatus.created_at)),
  );
  TestValidator.predicate(
    "expires_at is valid date-time",
    !isNaN(Date.parse(tokenStatus.expires_at)),
  );
  TestValidator.equals(
    "isActive is boolean",
    typeof tokenStatus.isActive,
    "boolean",
  );
}