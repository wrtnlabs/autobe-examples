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

/**
 * Test member registration workflow with valid credentials.
 *
 * Creates a new member account with unique email and valid password,
 * then validates the response structure and all required fields
 * including identity information and authorization tokens.
 */
export async function test_api_member_join(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email and valid password for registration
  const email = `${RandomGenerator.name(2)}@${RandomGenerator.alphabets(8)}.com`;
  const password = RandomGenerator.alphaNumeric(16);
  const href = "http://example.com/signup";
  const referrer = "http://example.com";
  // Call authorization utility function
  const output = await authorize_member_join(connection, {
    body: {
      email: email,
      password: password,
      href: href,
      referrer: referrer,
    } satisfies IMultiUserTodoMember.IJoin,
  });
  // Validate response structure (type validation)
  typia.assert(output);
  // Validate email matches input (business logic)
  TestValidator.equals("email matches input", output.email, email);
  // Validate token has access token (business logic)
  TestValidator.notEquals("access token is not empty", output.token.access, "");
  // Validate token has refresh token (business logic)
  TestValidator.notEquals(
    "refresh token is not empty",
    output.token.refresh,
    "",
  );
}
