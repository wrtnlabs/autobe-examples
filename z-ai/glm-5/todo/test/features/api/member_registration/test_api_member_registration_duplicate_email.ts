import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the business rule that email addresses must be unique across all registered members.
 *
 * This test validates:
 * 1. Successful member registration with a specific email address
 * 2. HTTP 409 Conflict when attempting to register with duplicate email
 * 3. Unique constraint enforcement on private_todo_app_members.email
 */
export async function test_api_member_registration_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for the test
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: Register first member with the email - should succeed
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: duplicateEmail,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstMember);
  // Verify first member was created with the expected email
  TestValidator.equals(
    "first member email matches",
    firstMember.email,
    duplicateEmail,
  );
  // Step 2: Attempt to register second member with same email - should fail with 409
  const secondMemberConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () => {
      await authorize_member_join(secondMemberConnection, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(16), // Different password
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
}
