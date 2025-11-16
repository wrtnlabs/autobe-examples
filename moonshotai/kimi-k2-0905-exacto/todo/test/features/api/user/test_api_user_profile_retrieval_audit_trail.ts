import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import type { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";

/**
 * Test audit trail functionality in profile retrieval including verification of
 * created_at and updated_at timestamps. This validates the complete account
 * lifecycle tracking system that supports operational monitoring and security
 * auditing requirements through comprehensive timestamp management.
 */
export async function test_api_user_profile_retrieval_audit_trail(
  connection: api.IConnection,
) {
  // Generate test user registration data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "TestPassword123",
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000/",
  } satisfies ITodoAppUser.IJoin;

  // Step 1: Create new user account
  const createdUser: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(createdUser);

  // Step 2: Verify user creation with audit timestamps
  TestValidator.predicate(
    "user has valid id",
    createdUser.id.length > 0 && createdUser.id.includes("-"),
  );
  TestValidator.equals(
    "user email matches input",
    createdUser.email,
    joinBody.email,
  );
  TestValidator.predicate(
    "user has creation timestamp",
    createdUser.created_at !== undefined && createdUser.created_at.length > 0,
  );
  TestValidator.predicate(
    "user has update timestamp",
    createdUser.updated_at !== undefined && createdUser.updated_at.length > 0,
  );

  // Verify timestamps are in proper ISO 8601 format
  const createdAtDate = new Date(createdUser.created_at);
  const updatedAtDate = new Date(createdUser.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(createdAtDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(updatedAtDate.getTime()),
  );

  // Step 3: Authenticate and retrieve user profile
  const profile: ITodoAppUserProfile =
    await api.functional.todoApp.user.auth.users.profile.at(connection, {
      userId: createdUser.id,
    });
  typia.assert(profile);

  // Step 4: Validate audit trail consistency
  TestValidator.equals(
    "profile id matches created user",
    profile.id,
    createdUser.id,
  );
  TestValidator.equals(
    "profile email matches created user",
    profile.email,
    createdUser.email,
  );
  TestValidator.equals(
    "profile created_at matches original",
    profile.created_at,
    createdUser.created_at,
  );
  TestValidator.equals(
    "profile updated_at matches original",
    profile.updated_at,
    createdUser.updated_at,
  );

  // Step 5: Verify timestamp format compliance for audit trail
  TestValidator.predicate(
    "profile timestamps maintain RFC 5322 email format",
    profile.email.includes("@") && profile.email.includes("."),
  );
  TestValidator.predicate(
    "created_at timestamp present for audit",
    profile.created_at !== null && profile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at timestamp present for audit",
    profile.updated_at !== null && profile.updated_at !== undefined,
  );

  // Step 6: Test additional audit trail validation
  await TestValidator.error("invalid user ID should fail", async () => {
    await api.functional.todoApp.user.auth.users.profile.at(connection, {
      userId: "00000000-0000-0000-0000-000000000000" as string &
        tags.Format<"uuid">,
    });
  });
}
