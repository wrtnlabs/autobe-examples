import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

export async function test_api_admin_registration_and_jwt_token_issuance(
  connection: api.IConnection,
) {
  // Generate unique random email and password hash
  const email = typia.random<string & tags.Format<"email">>();
  const passwordHash = RandomGenerator.alphaNumeric(64); // Simulate hashed password string

  // Prepare request body conforming to ITodoListAdmin.ICreate
  const requestBody = {
    email,
    password_hash: passwordHash,
  } satisfies ITodoListAdmin.ICreate;

  // Call admin join API
  const output: ITodoListAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: requestBody });

  // Assert complete type validation
  typia.assert(output);

  // Validate returned fields with descriptive titles
  TestValidator.predicate(
    "admin.id is non-empty string formatted as uuid",
    output.id.length > 0 &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        output.id,
      ),
  );
  TestValidator.equals(
    "admin.email matches request email",
    output.email,
    email,
  );
  TestValidator.predicate(
    "admin.created_at is ISO 8601 date-time string",
    typeof output.created_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(output.created_at),
  );
  TestValidator.predicate(
    "admin.updated_at is ISO 8601 date-time string",
    typeof output.updated_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(output.updated_at),
  );
  TestValidator.predicate(
    "admin.deleted_at is either null or ISO 8601 date-time string",
    output.deleted_at === null ||
      (typeof output.deleted_at === "string" &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
          output.deleted_at,
        )),
  );

  // Validate token fields existence and type
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof output.token.access === "string" && output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof output.token.refresh === "string" && output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token.expired_at is ISO 8601 date-time string",
    typeof output.token.expired_at === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        output.token.expired_at,
      ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601 date-time string",
    typeof output.token.refreshable_until === "string" &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
        output.token.refreshable_until,
      ),
  );
}
