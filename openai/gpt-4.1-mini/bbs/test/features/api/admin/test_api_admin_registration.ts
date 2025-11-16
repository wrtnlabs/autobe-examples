import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";

/**
 * Test the administrator registration process by creating a new admin account
 * with valid credentials. Verify successful creation of the admin account and
 * issuance of JWT tokens for authenticated sessions. Validate the storage of
 * admin credentials securely and the issuance of appropriate tokens upon
 * registration.
 */
export async function test_api_admin_registration(connection: api.IConnection) {
  // Prepare a unique username and email for the admin
  const username = `admin_${RandomGenerator.alphaNumeric(8)}`;
  const email = `${username}@example.com` as string & tags.Format<"email">;
  const password = RandomGenerator.alphaNumeric(16); // a secure random password

  // Create the request body
  const requestBody = {
    username,
    email,
    password,
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;

  // Call the admin join API to register the new admin
  const response: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: requestBody });

  // Assert the response type safety
  typia.assert(response);

  // Validate response properties
  TestValidator.predicate(
    "adminUsername matches request username",
    response.adminUsername === username,
  );

  TestValidator.equals(
    "admin email matches request email",
    response.email,
    email,
  );

  // Check that created_at and updated_at are proper ISO date-time strings
  TestValidator.predicate(
    "created_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.updated_at,
    ),
  );

  // deleted_at can be null or undefined for active accounts, check if null or undefined
  TestValidator.predicate(
    "deleted_at is null or undefined",
    response.deleted_at === null || response.deleted_at === undefined,
  );

  // Role should be "admin"
  TestValidator.equals("role is 'admin'", response.role, "admin");

  // The admin must be active
  TestValidator.predicate(
    "is_active flag is true",
    response.is_active === true,
  );

  // The id should be a non-empty string
  TestValidator.predicate(
    "id present",
    typeof response.id === "string" && response.id.length > 0,
  );

  // Validate token properties
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof response.token.access === "string" &&
      response.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof response.token.refresh === "string" &&
      response.token.refresh.length > 0,
  );

  // Validate access token expiry timestamps with ISO8601 format
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$/.test(
      response.token.refreshable_until,
    ),
  );
}
