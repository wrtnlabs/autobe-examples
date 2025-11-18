import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_admin_registration_with_token_authorization(
  connection: api.IConnection,
) {
  // Generate a valid email address for the new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();

  // Define a strong password for registration
  const adminPassword = RandomGenerator.alphaNumeric(12);

  // Prepare the admin creation request body using the ITodoListAdmin.ICreate type
  const createAdminBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ITodoListAdmin.ICreate;

  // Call the join API to register the new admin
  const authorizedAdmin: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: createAdminBody,
    });

  // Validate the API response data with typia.assert
  typia.assert(authorizedAdmin);

  // Validate that the returned email matches the requested email
  TestValidator.equals(
    "admin email matches the registration email",
    authorizedAdmin.email,
    adminEmail,
  );

  // Validate that a UUID formatted id is returned
  TestValidator.predicate(
    "admin id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorizedAdmin.id,
    ),
  );

  // Validate created_at and updated_at are valid date-time strings
  TestValidator.predicate(
    "created_at is a valid ISO date-time",
    !Number.isNaN(Date.parse(authorizedAdmin.created_at)),
  );
  TestValidator.predicate(
    "updated_at is a valid ISO date-time",
    !Number.isNaN(Date.parse(authorizedAdmin.updated_at)),
  );

  // Validate deleted_at is either null or undefined
  TestValidator.predicate(
    "deleted_at is null, undefined or absent",
    authorizedAdmin.deleted_at === null ||
      authorizedAdmin.deleted_at === undefined,
  );

  // Validate token properties structure and format
  const token: IAuthorizationToken = authorizedAdmin.token;
  typia.assert(token);

  TestValidator.predicate(
    "access token is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );

  TestValidator.predicate(
    "expired_at is a valid ISO date-time",
    !Number.isNaN(Date.parse(token.expired_at)),
  );

  TestValidator.predicate(
    "refreshable_until is a valid ISO date-time",
    !Number.isNaN(Date.parse(token.refreshable_until)),
  );
}
