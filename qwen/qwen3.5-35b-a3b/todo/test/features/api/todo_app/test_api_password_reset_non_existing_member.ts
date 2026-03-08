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

export async function test_api_password_reset_non_existing_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an existing member account (for authorization setup)
  const existingMemberConnection: api.IConnection = { host: connection.host };
  const existingMember = await authorize_member_join(existingMemberConnection, {
    body: {
      email: "existing@example.com",
      password: "TestPassword123!",
      displayName: RandomGenerator.name(),
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(existingMember);
  // 2. Send password reset request for non-existing email
  const resetConnection: api.IConnection = { host: connection.host };
  const firstResetResponse =
    await api.functional.todoApp.member.password_resets.requestReset(
      resetConnection,
      {
        body: {
          email: "nonexistent@example.com",
        } satisfies ITodoAppMemberPasswordReset.ICreate,
      },
    );
  typia.assert(firstResetResponse);
  // 3. Verify response structure - should have id and created_at
  TestValidator.equals(
    "first reset response has id",
    typeof firstResetResponse.id === "string" &&
      firstResetResponse.id.length === 36,
    true,
  );
  TestValidator.equals(
    "first reset response has created_at",
    typeof firstResetResponse.created_at === "string",
    true,
  );
  // 4. Send second request with same non-existing email
  const secondResetResponse =
    await api.functional.todoApp.member.password_resets.requestReset(
      resetConnection,
      {
        body: {
          email: "nonexistent@example.com",
        } satisfies ITodoAppMemberPasswordReset.ICreate,
      },
    );
  typia.assert(secondResetResponse);
  // 5. Verify second request creates new token with different ID
  TestValidator.notEquals(
    "second reset creates new token with different ID",
    firstResetResponse.id,
    secondResetResponse.id,
  );
  TestValidator.equals(
    "second reset response has created_at",
    typeof secondResetResponse.created_at === "string",
    true,
  );
  // 6. Verify both responses have same structure (security: indistinguishable)
  TestValidator.equals(
    "both responses have id field",
    typeof firstResetResponse.id,
    typeof secondResetResponse.id,
  );
  TestValidator.equals(
    "both responses have created_at field",
    typeof firstResetResponse.created_at,
    typeof secondResetResponse.created_at,
  );
}
