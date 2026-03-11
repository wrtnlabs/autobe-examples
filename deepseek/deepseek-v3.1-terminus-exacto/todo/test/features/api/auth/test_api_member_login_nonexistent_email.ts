import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // First, create a valid member account to test authentication errors
  const memberConnection: api.IConnection = { host: connection.host };
  const validMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(validMember);
  // Test 1: Attempt login with incorrect password (existing email)
  let incorrectPasswordError: Error | undefined;
  try {
    await authorize_member_login(memberConnection, {
      body: {
        email: validMember.email,
        password: RandomGenerator.alphaNumeric(16), // Different password
      } satisfies IMultiUserTodoMember.ILogin,
    });
  } catch (error) {
    incorrectPasswordError = error as Error;
  }
  // Test 2: Attempt login with non-existent email
  let nonExistentEmailError: Error | undefined;
  try {
    await authorize_member_login(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(), // Non-existent email
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IMultiUserTodoMember.ILogin,
    });
  } catch (error) {
    nonExistentEmailError = error as Error;
  }
  // Validate that both errors occurred
  TestValidator.predicate(
    "incorrect password should cause error",
    incorrectPasswordError !== undefined,
  );
  TestValidator.predicate(
    "non-existent email should cause error",
    nonExistentEmailError !== undefined,
  );
  // Validate that error messages are generic and identical (security requirement)
  if (incorrectPasswordError && nonExistentEmailError) {
    const incorrectPasswordMessage = incorrectPasswordError.message;
    const nonExistentEmailMessage = nonExistentEmailError.message;
    TestValidator.equals(
      "error messages should be identical for security",
      incorrectPasswordMessage,
      nonExistentEmailMessage,
    );
    TestValidator.predicate(
      "error message should not reveal email existence",
      !nonExistentEmailMessage.toLowerCase().includes("email") &&
        !nonExistentEmailMessage.toLowerCase().includes("exist"),
    );
  }
}
