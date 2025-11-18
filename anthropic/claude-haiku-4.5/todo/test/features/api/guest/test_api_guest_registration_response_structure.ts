import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function test_api_guest_registration_response_structure(
  connection: api.IConnection,
) {
  // Register a new guest user with random email and password
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);

  const response: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoListGuest.ICreate,
    });

  // Complete type validation - typia.assert validates ALL aspects:
  // - All required fields present
  // - All fields match correct types
  // - UUID format validation
  // - ISO 8601 date-time format validation
  // - Token object structure and types
  typia.assert(response);

  // Business logic validation: email is normalized to lowercase
  TestValidator.equals(
    "email is normalized to lowercase",
    response.email,
    email.toLowerCase(),
  );

  // Business rule validation: no sensitive information exposed
  TestValidator.predicate(
    "response does not expose password_hash",
    !Object.prototype.hasOwnProperty.call(response, "password_hash"),
  );

  TestValidator.predicate(
    "response does not expose password",
    !Object.prototype.hasOwnProperty.call(response, "password"),
  );
}
