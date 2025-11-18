import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_registration_timestamps_initialization(
  connection: api.IConnection,
) {
  /**
   * Test that user account timestamps are correctly initialized upon
   * registration.
   *
   * When a new user registers through the join endpoint, the system must
   * initialize all timestamp fields correctly:
   *
   * - Created_at and updated_at should be set to the current UTC time
   * - Deleted_at should be null (account is active)
   * - Last_login_at should be null (user has never logged in)
   *
   * This test verifies the timestamp initialization behavior and validates that
   * all timestamps are in UTC timezone using ISO 8601 format.
   */

  // Record the approximate registration time in UTC before making the request
  const beforeRegistration = new Date();

  // Generate registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.MinLength<8>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Register a new user
  const response: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies ITodoListUser.ICreate,
    });

  // Validate the response
  typia.assert(response);

  // Record the approximate registration time after making the request
  const afterRegistration = new Date();

  // Validate created_at timestamp
  TestValidator.predicate(
    "created_at should be set and in ISO 8601 format",
    typeof response.created_at === "string" &&
      response.created_at.includes("T") &&
      response.created_at.includes("Z"),
  );

  TestValidator.predicate(
    "created_at should be within registration time window",
    new Date(response.created_at) >= beforeRegistration &&
      new Date(response.created_at) <= afterRegistration,
  );

  // Validate updated_at timestamp
  TestValidator.predicate(
    "updated_at should be set and in ISO 8601 format",
    typeof response.updated_at === "string" &&
      response.updated_at.includes("T") &&
      response.updated_at.includes("Z"),
  );

  TestValidator.predicate(
    "updated_at should be within registration time window",
    new Date(response.updated_at) >= beforeRegistration &&
      new Date(response.updated_at) <= afterRegistration,
  );

  // Validate that created_at and updated_at are equal (simultaneous creation and update)
  TestValidator.equals(
    "created_at and updated_at should be equal at registration",
    response.created_at,
    response.updated_at,
  );

  // Validate deleted_at is null (account is active)
  TestValidator.equals(
    "deleted_at should be null for active account",
    response.deleted_at,
    null,
  );

  // Validate last_login_at is null (user has never logged in)
  TestValidator.equals(
    "last_login_at should be null for new user",
    response.last_login_at,
    null,
  );

  // Validate timestamp format - should be ISO 8601 with Z suffix (UTC)
  TestValidator.predicate(
    "created_at should end with Z indicating UTC",
    response.created_at.endsWith("Z"),
  );

  TestValidator.predicate(
    "updated_at should end with Z indicating UTC",
    response.updated_at.endsWith("Z"),
  );
}
