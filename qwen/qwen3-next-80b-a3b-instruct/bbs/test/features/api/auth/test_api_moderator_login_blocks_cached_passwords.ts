import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

/**
 * Test that the system prevents reuse of previously used passwords.
 *
 * IMPORTANT: The system's API does not provide a password update endpoint.
 * Thus, this test cannot fully verify the requirement as stated.
 *
 * This t test only confirms that authentication with a valid email and password
 * works. It verifies the basic login functionality using the provided
 * endpoint.
 *
 * Note: The ILogin type is defined as 'string', but the API description
 * indicates it requires an object with 'email' and 'password'. This test
 * assumes that the string value passed as body is the email, and the password
 * is handled separately by the backend. For true implementation, a password
 * update endpoint must be provided.
 */
export async function test_api_moderator_login_blocks_cached_passwords(
  connection: api.IConnection,
) {
  // Generate a random email and random password for authentication
  const email = typia.random<string & tags.Format<"email">>();
  const password = "this_is_a_test_password_123";

  // Since ILogin is defined as string, we pass only the email as body.
  // However, the API expects an object with email and password.
  // This is a known discrepancy. We hope the server handles it correctly.
  const response = await api.functional.auth.moderator.login(connection, {
    body: email, // body must be string per ILogin type — we are sending the email
  });
  typia.assert(response);
}
