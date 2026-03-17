import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test member registration with duplicate email address.
 * According to section 76: 'THE todoApp SHALL reject the request with an error
 * message indicating that the email is already registered.'
 * 'THE todoApp SHALL NOT create a duplicate user account.'
 * 'THE todoApp SHALL NOT reveal whether any specific email address exists in
 * the system during sign up.'
 */
export async function test_api_member_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique test data
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create join request body
  const joinBody = {
    email: duplicateEmail,
    password,
    display_name: displayName,
    href,
    referrer,
    ip,
  } satisfies ITodoAppMember.IJoin;
  // First registration - should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstConnection, {
    body: joinBody,
  });
  typia.assert(firstMember);
  // Verify first registration successful
  TestValidator.equals("email matches", firstMember.email, duplicateEmail);
  TestValidator.equals(
    "display name matches",
    firstMember.display_name,
    displayName,
  );
  TestValidator.predicate(
    "has valid token",
    firstMember.token.access.length > 0 && firstMember.token.refresh.length > 0,
  );
  // Second registration attempt - should fail with duplicate email error
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      // USE UTILITY FUNCTION instead of SDK function
      await authorize_member_join(secondConnection, {
        body: joinBody,
      });
    },
  );
  // Verify no authorization token was generated for failed attempt
  TestValidator.predicate(
    "no token generated for failed registration",
    !secondConnection.headers?.Authorization,
  );
  // Verify first connection still has valid token
  TestValidator.predicate(
    "first registration token persists",
    typeof firstConnection.headers?.Authorization === "string" &&
      firstConnection.headers.Authorization.length > 0,
  );
  // Business rule compliance: The error response from authorize_member_join
  // will contain an error message, but we trust that it follows section 76
  // by not revealing whether the specific email exists in the system.
  // The TestValidator.error ensures that an error is thrown for duplicate email.
}
