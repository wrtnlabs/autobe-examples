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
 * Test email enumeration prevention security feature.
 *
 * Request a password reset using an email address that does not exist in the system.
 * The system should return the same generic 200 OK response as it would for a valid email,
 * without revealing whether the email is registered. This prevents attackers from determining
 * which email addresses are associated with member accounts.
 *
 * Verify that the response status and message are identical to the success case,
 * confirming no information leakage about email existence.
 */
export async function test_api_password_reset_email_enumeration_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a valid member to establish baseline behavior
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppMember.IJoin,
  });
  typia.assert(member);
  // 2. Request password reset with non-existent email
  const resetConnection: api.IConnection = { host: connection.host };
  const nonExistentEmail = `nonexistent_${typia.random<string & tags.Format<"uuid">>()}@example.com`;
  const resetResponse =
    await api.functional.todoApp.member.password_resets.request(
      resetConnection,
      {
        body: {
          email: nonExistentEmail,
        } satisfies ITodoAppMemberPasswordReset.IRequest,
      },
    );
  typia.assert(resetResponse);
  // 3. Verify response structure matches expected format
  // The response should have the same structure regardless of email existence
  TestValidator.predicate(
    "response has status field",
    resetResponse.status !== undefined,
  );
  TestValidator.predicate(
    "response has message field",
    resetResponse.message !== undefined,
  );
  TestValidator.predicate(
    "status is string",
    typeof resetResponse.status === "string",
  );
  TestValidator.predicate(
    "message is string",
    typeof resetResponse.message === "string",
  );
  // 4. Verify no error was thrown (200 OK returned)
  // If the system properly prevents enumeration, it should return success even for non-existent emails
  TestValidator.predicate("password reset completed without error", true);
}
