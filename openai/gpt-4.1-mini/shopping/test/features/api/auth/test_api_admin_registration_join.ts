import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

/**
 * Test the complete administrator registration workflow.
 *
 * This test verifies that a new admin can register by providing unique email
 * and valid password, and that the response contains a valid JWT token pair for
 * authenticated operations.
 *
 * It validates important security measures such as proper password handling and
 * prevention of duplicate registrations by ensuring unique emails.
 *
 * The test inputs are generated with type-safe random values following the DTO
 * definitions.
 */
export async function test_api_admin_registration_join(
  connection: api.IConnection,
) {
  const email = typia.random<string & tags.Format<"email">>();
  const requestBody = {
    email,
    password: "password123",
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.IJoin;

  const response: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: requestBody,
    });

  typia.assert(response);

  TestValidator.predicate(
    "response.id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
  );

  TestValidator.predicate(
    "created_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      response.created_at,
    ),
  );

  TestValidator.predicate(
    "updated_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      response.updated_at,
    ),
  );

  TestValidator.predicate(
    "token.access is string",
    typeof response.token.access === "string",
  );
  TestValidator.predicate(
    "token.refresh is string",
    typeof response.token.refresh === "string",
  );
  TestValidator.predicate(
    "token.expired_at is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      response.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "token.refreshable_until is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      response.token.refreshable_until,
    ),
  );

  TestValidator.equals(
    "response.email matches request email",
    response.email,
    email,
  );
}
