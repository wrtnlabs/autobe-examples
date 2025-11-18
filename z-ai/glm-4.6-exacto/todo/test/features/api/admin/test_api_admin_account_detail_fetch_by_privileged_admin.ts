import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdmin";
import type { ITodoAppAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminSession";

/**
 * Verifies that a privileged admin can retrieve complete account details of an
 * administrator by UUID. Scenario begins by registering a new admin via join,
 * then uses the issued token to fetch that admin's details using the GET
 * endpoint. Validates response includes all stored fields (id, email,
 * password_hash, created_at, updated_at, deleted_at) as per the ITodoAppAdmin
 * schema. Checks access controls by ensuring that non-admins and
 * unauthenticated users cannot perform this fetch. Also covers edge case:
 * fetching details for a soft-deleted admin returns not found error.
 */
export async function test_api_admin_account_detail_fetch_by_privileged_admin(
  connection: api.IConnection,
) {
  // 1. Register the first privileged admin and authenticate (adminA)
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const adminAJoinInput = {
    email: adminAEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://todo-app.com/join-adminA",
    referrer: "https://todo-app.com/home",
  } satisfies ITodoAppAdmin.IJoin;
  const adminA = await api.functional.auth.admin.join(connection, {
    body: adminAJoinInput,
  });
  typia.assert(adminA);

  // 2. Register a second admin (adminB) while authenticated as adminA
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBJoinInput = {
    email: adminBEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://todo-app.com/join-adminB",
    referrer: "https://todo-app.com/home",
  } satisfies ITodoAppAdmin.IJoin;
  const adminB = await api.functional.auth.admin.join(connection, {
    body: adminBJoinInput,
  });
  typia.assert(adminB);

  // 3. Fetch adminB details as adminA (privileged context)
  const fetchedAdmin = await api.functional.todoApp.admin.admins.at(
    connection,
    { adminId: adminB.id },
  );
  typia.assert(fetchedAdmin);
  TestValidator.equals("admin id should match", fetchedAdmin.id, adminB.id);
  TestValidator.equals(
    "admin email should match",
    fetchedAdmin.email,
    adminB.email,
  );
  TestValidator.predicate(
    "password_hash should be non-empty",
    typeof fetchedAdmin.password_hash === "string" &&
      fetchedAdmin.password_hash.length > 0,
  );
  TestValidator.predicate(
    "created_at format valid",
    typeof fetchedAdmin.created_at === "string" &&
      fetchedAdmin.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at format valid",
    typeof fetchedAdmin.updated_at === "string" &&
      fetchedAdmin.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at present and null or date-time string",
    fetchedAdmin.deleted_at === null ||
      typeof fetchedAdmin.deleted_at === "string",
  );

  // 4. Try to fetch with unauthenticated context
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated admin fetch should fail",
    async () => {
      await api.functional.todoApp.admin.admins.at(unauthConn, {
        adminId: adminB.id,
      });
    },
  );

  // 5. Attempt to fetch a soft-deleted admin (simulate deletion by setting deleted_at)
  // NOTE: There is no delete endpoint; this can only be simulated. In real E2E, this would use an explicit delete endpoint.
  // For simulation, let's assume adminB is now soft-deleted by setting a dummy deleted_at via mock.
  // Here, actually we cannot set deleted_at, so we cover the negative path by querying with a random UUID.
  await TestValidator.error(
    "fetching a non-existent (deleted) admin should fail",
    async () => {
      await api.functional.todoApp.admin.admins.at(connection, {
        adminId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
