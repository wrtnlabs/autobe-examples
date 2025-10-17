import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

export async function test_api_guest_join_success(connection: api.IConnection) {
  /**
   * E2E test for POST /auth/guest/join - happy path and anonymous join.
   *
   * Steps:
   *
   * 1. Create a guest with a valid email and validate returned authorization
   *    payload and persisted guest metadata.
   * 2. Create an anonymous guest (no email) and validate returned payload.
   * 3. Verify token structural properties and parseability of timestamps.
   * 4. Ensure two created guest ids are distinct.
   */

  // 1) Guest join with provided email
  const email: string = typia.random<string & tags.Format<"email">>();

  const authorizedWithEmail: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: { email } satisfies ITodoAppGuest.IJoin,
    });
  // Runtime type validation
  typia.assert(authorizedWithEmail);

  // Business validations
  TestValidator.equals(
    "returned email matches input",
    authorizedWithEmail.email,
    email,
  );

  TestValidator.predicate(
    "access token present",
    typeof authorizedWithEmail.token.access === "string" &&
      authorizedWithEmail.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token present",
    typeof authorizedWithEmail.token.refresh === "string" &&
      authorizedWithEmail.token.refresh.length > 0,
  );

  TestValidator.predicate(
    "created_at is parseable ISO 8601",
    !Number.isNaN(Date.parse(authorizedWithEmail.created_at)),
  );

  TestValidator.predicate(
    "token.expired_at is parseable ISO 8601",
    !Number.isNaN(Date.parse(authorizedWithEmail.token.expired_at)),
  );

  TestValidator.predicate(
    "token.refreshable_until is parseable ISO 8601",
    !Number.isNaN(Date.parse(authorizedWithEmail.token.refreshable_until)),
  );

  // 2) Anonymous guest join (no email provided)
  const authorizedAnonymous: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies ITodoAppGuest.IJoin,
    });
  typia.assert(authorizedAnonymous);

  TestValidator.predicate(
    "anonymous guest has null or undefined email",
    authorizedAnonymous.email === null ||
      authorizedAnonymous.email === undefined,
  );

  // 3) Ensure two guest IDs are distinct
  TestValidator.notEquals(
    "guest ids should be different for separate joins",
    authorizedWithEmail.id,
    authorizedAnonymous.id,
  );
}
