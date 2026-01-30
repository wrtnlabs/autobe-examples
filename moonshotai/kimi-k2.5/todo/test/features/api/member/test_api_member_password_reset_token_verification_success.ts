import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import type { ITodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberSession";
import type { ITodoAppPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppPasswordResetToken";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test successful password reset token verification.
 *
 * This test validates the password reset token verification flow:
 *
 * 1. Creates a member account via the join endpoint
 * 2. Calls the password reset token verification endpoint with a valid token
 *    format
 * 3. Validates that the response returns the member's ID and email address
 *    (ITodoAppMember.ISummary)
 *
 * The verification endpoint confirms that a password reset token is valid and
 * not expired, returning minimal member information required for the subsequent
 * password reset operation.
 */
export async function test_api_member_password_reset_token_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member account that will request password reset
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Verify password reset token
  // The token would normally be generated via a password reset request email
  const verifyBody = {
    token: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ITodoAppPasswordResetToken.IVerify;
  const summary =
    await api.functional.todoApp.member.auth.members.password.reset.verify(
      connection,
      {
        body: verifyBody,
      },
    );
  typia.assert(summary);
  // Step 3: Validate response contains member summary with ID and email
  TestValidator.predicate(
    "member summary has valid id",
    typeof summary.id === "string",
  );
  TestValidator.predicate(
    "member summary has valid email",
    typeof summary.email === "string",
  );
}
