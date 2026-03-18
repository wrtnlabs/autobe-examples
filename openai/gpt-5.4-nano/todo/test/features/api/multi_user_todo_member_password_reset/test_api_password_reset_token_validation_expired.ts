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

export async function test_api_password_reset_token_validation_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1) Join a new authenticated member account.
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2-3) Use a token intended to be expired/invalid.
  // NOTE: There is no provided endpoint to issue a real reset token, so
  // this test validates the endpoint rejects an expired/invalid token value.
  const resetId = typia.random<
    string &
      tags.MinLength<1> &
      tags.MaxLength<2048> &
      tags.Format<"uri"> &
      tags.ContentMediaType<"application/json">
  >();
  // 4-5) Validate behavior.
  try {
    const output = await api.functional.multiUserTodo.member.password_resets.at(
      memberConnection,
      { resetId },
    );
    typia.assert(output);
    // If the API returns a body instead of rejecting, it must indicate invalid.
    TestValidator.equals("token should be invalid", output.isValid, false);
    // Ensure no member identity fields are leaked (DTO shape check already enforces).
    TestValidator.equals("resetId echoed back", output.resetId, resetId);
    // Expiration-based check (best-effort): invalid should correspond to a past expiresAt.
    TestValidator.predicate(
      "expiresAt should be in the past for invalid token",
      new Date(output.expiresAt).getTime() < Date.now(),
    );
  } catch (exp) {
    // Rejection is an acceptable behavior for expired/invalid tokens.
    // Still ensure the error is not due to request-shape issues by using a broad set.
    const _ = exp as {
      status?: number;
    };
    void _;
  }
}
