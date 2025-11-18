import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function test_api_guest_registration_minimal_valid_credentials(
  connection: api.IConnection,
) {
  // Register a guest user with minimal valid credentials
  const minimalEmail = typia.random<string & tags.Format<"email">>();
  const minimalPassword = "a"; // Single character password (meets minLength<1> constraint)

  const registered = await api.functional.auth.guest.join(connection, {
    body: {
      email: minimalEmail,
      password: minimalPassword,
    } satisfies ITodoListGuest.ICreate,
  });

  typia.assert(registered);

  // Verify response structure and key properties
  TestValidator.equals(
    "registered guest has valid email",
    registered.email,
    minimalEmail,
  );
  TestValidator.predicate("registered guest has id", registered.id !== "");
  TestValidator.predicate(
    "registered guest has created_at timestamp",
    registered.created_at !== "",
  );
  TestValidator.predicate(
    "registered guest has updated_at timestamp",
    registered.updated_at !== "",
  );
  TestValidator.predicate(
    "registered guest has token with access token",
    registered.token.access !== "",
  );
  TestValidator.predicate(
    "registered guest has token with refresh token",
    registered.token.refresh !== "",
  );
  TestValidator.predicate(
    "registered guest token has expiration timestamp",
    registered.token.expired_at !== "",
  );
  TestValidator.predicate(
    "registered guest token has refresh expiration timestamp",
    registered.token.refreshable_until !== "",
  );
}
