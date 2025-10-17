import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";

/**
 * Validate admin-scoped retrieval of a guest record by ID.
 *
 * Business context:
 *
 * - An administrator must be able to read guest records for support and
 *   housekeeping purposes. This test verifies that admin authentication grants
 *   read access to the guest record and that the returned payload matches the
 *   public guest DTO (ITodoAppGuest).
 *
 * Steps:
 *
 * 1. Create a new admin account via POST /auth/admin/join and ensure admin
 *    credentials (token) are available on the provided connection.
 * 2. Create a guest record via POST /auth/guest/join using a separate
 *    unauthenticated connection object so the guest's token does not overwrite
 *    the admin token on the main connection.
 * 3. As the admin (original connection containing admin token), call GET
 *    /todoApp/admin/guests/{guestId} and validate the returned guest payload
 *    matches and contains expected fields.
 */
export async function test_api_guest_retrieval_by_admin_success(
  connection: api.IConnection,
) {
  // 1. Admin registration (the SDK will place admin token into connection.headers)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: ITodoAppAdmin.IAuthorized = await api.functional.auth.admin.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: "Admin@1234",
      } satisfies ITodoAppAdmin.ICreate,
    },
  );
  typia.assert(admin);

  // Sanity check: admin token should be present (SDK sets it on connection)
  TestValidator.predicate(
    "admin token is present after join",
    typeof admin.token?.access === "string" && admin.token.access.length > 0,
  );

  // 2. Create a guest using a cloned connection with empty headers to avoid
  // overwriting the admin token on the original connection (SDK writes tokens
  // to the given connection object).
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  const guestBody = {
    email: typia.random<string & tags.Format<"email">>(),
  } satisfies ITodoAppGuest.IJoin;

  const guestAuth: ITodoAppGuest.IAuthorized =
    await api.functional.auth.guest.join(unauthConn, {
      body: guestBody,
    });
  typia.assert(guestAuth);

  TestValidator.predicate(
    "guest create returned a valid id",
    typeof guestAuth.id === "string" && guestAuth.id.length > 0,
  );

  // 3. As admin (original connection still holds admin token), retrieve guest
  const retrieved: ITodoAppGuest = await api.functional.todoApp.admin.guests.at(
    connection,
    {
      guestId: guestAuth.id,
    },
  );
  typia.assert(retrieved);

  // Validate returned business properties
  TestValidator.equals(
    "retrieved guest id matches requested id",
    retrieved.id,
    guestAuth.id,
  );

  // Email is nullable; compare normalized values (actual-first, expected-second)
  TestValidator.equals(
    "retrieved guest email matches created guest",
    retrieved.email ?? null,
    guestAuth.email ?? null,
  );

  // created_at must exist (typia.assert already checks format); check presence
  TestValidator.predicate(
    "retrieved guest has created_at",
    typeof retrieved.created_at === "string" && retrieved.created_at.length > 0,
  );

  // last_active_at and status are nullable: ensure they are either null/undefined or string
  TestValidator.predicate(
    "last_active_at is nullable or ISO string",
    retrieved.last_active_at === null ||
      retrieved.last_active_at === undefined ||
      typeof retrieved.last_active_at === "string",
  );

  TestValidator.predicate(
    "status is nullable or string",
    retrieved.status === null ||
      retrieved.status === undefined ||
      typeof retrieved.status === "string",
  );
}
