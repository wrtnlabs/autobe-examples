import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityAdminSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdminSettings";

/**
 * Tests the entire flow of registering a new admin account through the
 * /auth/admin/join endpoint.
 *
 * This test validates that providing a unique email and valid password results
 * in successful admin creation, returning a properly structured admin object
 * with JWT tokens.
 *
 * It verifies the response fields, token presence, and correct data formats. It
 * also tests the error cases such as duplicate emails and invalid input data.
 */
export async function test_api_admin_account_registration(
  connection: api.IConnection,
) {
  // 1. Register a new admin user with unique email and password
  const email = `${RandomGenerator.alphabets(8)}@example.com`;
  const password = "ValidPassword123!";

  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: email,
      password: password,
    } satisfies IRedditCommunityAdmin.ICreate,
  });
  typia.assert(admin);

  // Validate response fields
  TestValidator.equals("Admin email matches input", admin.email, email);
  TestValidator.predicate(
    "Admin role is string and non-empty",
    typeof admin.role === "string" && admin.role.length > 0,
  );
  TestValidator.predicate("Admin is_active is true", admin.is_active === true);
  TestValidator.predicate(
    "Token access and refresh are non-empty strings",
    typeof admin.token.access === "string" &&
      admin.token.access.length > 0 &&
      typeof admin.token.refresh === "string" &&
      admin.token.refresh.length > 0,
  );

  // 2. Test duplicate email registration fails
  await TestValidator.error("Duplicate email registration fails", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: email, // duplicate
        password: password,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  });

  // 3. Test invalid email format fails
  await TestValidator.error("Invalid email format fails", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: "not-an-email",
        password: password,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  });

  // 4. Test empty password fails
  await TestValidator.error("Empty password fails", async () => {
    await api.functional.auth.admin.join(connection, {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com`,
        password: "",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  });
}
