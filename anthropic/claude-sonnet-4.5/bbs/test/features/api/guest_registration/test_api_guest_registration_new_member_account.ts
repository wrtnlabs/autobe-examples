import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test successful guest registration for creating a new member account.
 *
 * This test validates that a guest user can successfully register with valid
 * credentials (username, email, password) and receive JWT authentication tokens
 * for immediate access.
 *
 * Test workflow:
 *
 * 1. Generate valid registration data with proper constraints
 * 2. Submit registration request to the API
 * 3. Validate the complete response structure with typia.assert
 */
export async function test_api_guest_registration_new_member_account(
  connection: api.IConnection,
) {
  // Generate valid registration data using typia.random with proper tags
  const registrationData = {
    username: typia.random<
      string &
        tags.MinLength<3> &
        tags.MaxLength<30> &
        tags.Pattern<"^[a-zA-Z0-9_-]+$">
    >(),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.IRegistration;

  // Submit registration request
  const response: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });

  // Validate complete response structure - this validates EVERYTHING
  typia.assert(response);
}
