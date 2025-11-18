import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";

export async function test_api_guest_registration_timestamps_utc(
  connection: api.IConnection,
) {
  // Record the timestamp before registration
  const beforeRegistration = new Date();
  const beforeRegistrationISO = beforeRegistration.toISOString();

  // Register a new guest account
  const guest: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "testPassword123",
      } satisfies ITodoListGuest.ICreate,
    });
  typia.assert(guest);

  // Record timestamp after registration
  const afterRegistration = new Date();
  const afterRegistrationISO = afterRegistration.toISOString();

  // Verify created_at timestamp exists and is in UTC ISO 8601 format
  TestValidator.predicate(
    "created_at is defined",
    guest.created_at !== null && guest.created_at !== undefined,
  );

  TestValidator.predicate(
    "created_at follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(guest.created_at),
  );

  // Verify updated_at timestamp exists and matches created_at
  TestValidator.predicate(
    "updated_at is defined",
    guest.updated_at !== null && guest.updated_at !== undefined,
  );

  TestValidator.predicate(
    "updated_at follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(guest.updated_at),
  );

  TestValidator.equals(
    "updated_at equals created_at at registration",
    guest.updated_at,
    guest.created_at,
  );

  // Verify created_at and updated_at are within the registration time window
  const createdAtTime = new Date(guest.created_at).getTime();
  const beforeRegistrationTime = beforeRegistration.getTime();
  const afterRegistrationTime = afterRegistration.getTime();

  TestValidator.predicate(
    "created_at is within registration time window",
    createdAtTime >= beforeRegistrationTime &&
      createdAtTime <= afterRegistrationTime,
  );

  TestValidator.predicate(
    "updated_at timestamp is within registration time window",
    new Date(guest.updated_at).getTime() >= beforeRegistrationTime &&
      new Date(guest.updated_at).getTime() <= afterRegistrationTime,
  );

  // Verify last_login_at is null until first login
  TestValidator.predicate(
    "last_login_at is null or undefined at registration",
    guest.last_login_at === null || guest.last_login_at === undefined,
  );

  // Verify token expiration timestamps are in UTC ISO 8601 format
  TestValidator.predicate(
    "token.expired_at follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      guest.token.expired_at,
    ),
  );

  TestValidator.predicate(
    "token.refreshable_until follows ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      guest.token.refreshable_until,
    ),
  );

  // Verify all timestamps end with Z indicating UTC timezone
  TestValidator.predicate(
    "created_at ends with Z (UTC)",
    guest.created_at.endsWith("Z"),
  );

  TestValidator.predicate(
    "updated_at ends with Z (UTC)",
    guest.updated_at.endsWith("Z"),
  );

  TestValidator.predicate(
    "token.expired_at ends with Z (UTC)",
    guest.token.expired_at.endsWith("Z"),
  );

  TestValidator.predicate(
    "token.refreshable_until ends with Z (UTC)",
    guest.token.refreshable_until.endsWith("Z"),
  );

  // Verify token expiration timestamps are in the future
  const expiredAtTime = new Date(guest.token.expired_at).getTime();
  const refreshableUntilTime = new Date(
    guest.token.refreshable_until,
  ).getTime();
  const currentTime = new Date().getTime();

  TestValidator.predicate(
    "token.expired_at is in the future",
    expiredAtTime > currentTime,
  );

  TestValidator.predicate(
    "token.refreshable_until is in the future",
    refreshableUntilTime > currentTime,
  );

  TestValidator.predicate(
    "token.refreshable_until is after token.expired_at",
    refreshableUntilTime > expiredAtTime,
  );
}
