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

/**
 * Test the primary success path for password reset request.
 *
 * A registered member requests a password reset by providing their registered email address.
 * The system should validate the email format, find the member account, generate a
 * cryptographically secure token, create a password reset record with 1-hour expiration,
 * send a reset email, and return a 200 OK confirmation message.
 *
 * Verify that the response contains the expected success status and generic confirmation
 * message. This test validates the core password reset initiation workflow.
 */
export async function test_api_password_reset_request_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset using the member's registered email
  const passwordResetConnection: api.IConnection = { host: connection.host };
  const resetResponse =
    await api.functional.todoApp.member.password_resets.request(
      passwordResetConnection,
      {
        body: {
          email: member.email,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse);
  // 3. Validate the response contains expected fields
  TestValidator.predicate(
    "response has status",
    resetResponse.status !== undefined,
  );
  TestValidator.predicate(
    "response has message",
    resetResponse.message !== undefined,
  );
  TestValidator.predicate(
    "message is non-empty",
    resetResponse.message.length > 0,
  );
}
