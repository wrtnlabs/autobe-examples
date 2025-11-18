import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";

/**
 * Validate admin peer detail lookup for todoApp administrative users.
 *
 * Business goal:
 *
 * - Ensure that the admin detail endpoint GET
 *   /todoApp/adminUser/adminUsers/{adminUserId} returns the correct
 *   ITodoAppAdminUser record when given an existing adminUser id.
 * - Confirm that two independently created admin accounts (Admin A and Admin B)
 *   remain distinct and that fetching by Admin B’s id returns Admin B’s data,
 *   not Admin A’s.
 * - Validate that the detail DTO only exposes non-sensitive metadata and is
 *   consistent with the data returned from the join operation.
 *
 * Test steps:
 *
 * 1. Register Admin A via POST /auth/adminUser/join with random
 *    ITodoAppAdminUser.IJoin data.
 *
 *    - Capture the ITodoAppAdminUser.IAuthorized response as adminA.
 * 2. Register Admin B via POST /auth/adminUser/join.
 *
 *    - Capture the ITodoAppAdminUser.IAuthorized response as adminB.
 * 3. Call GET /todoApp/adminUser/adminUsers/{adminUserId} with adminUserId =
 *    adminB.id using api.functional.todoApp.adminUser.adminUsers.at.
 * 4. Validate that the returned ITodoAppAdminUser record (detail) passes
 *    typia.assert and matches Admin B’s core fields:
 *
 *    - Id, email, display_name, status,
 *    - Failed_login_count,
 *    - Last_login_at, created_at, updated_at, deleted_at.
 * 5. Validate that the detail record differs from Admin A:
 *
 *    - Id is not equal,
 *    - Email is not equal.
 */
export async function test_api_admin_user_detail_other_admin_account(
  connection: api.IConnection,
) {
  // 1. Register Admin A via /auth/adminUser/join
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminA: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminA);

  // 2. Register Admin B via /auth/adminUser/join
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppAdminUser.IJoin;

  const adminB: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert<ITodoAppAdminUser.IAuthorized>(adminB);

  // 3. Fetch Admin B detail via GET /todoApp/adminUser/adminUsers/{adminUserId}
  const detail: ITodoAppAdminUser =
    await api.functional.todoApp.adminUser.adminUsers.at(connection, {
      adminUserId: adminB.id,
    });
  typia.assert<ITodoAppAdminUser>(detail);

  // 4. Core equality checks between detail and Admin B
  TestValidator.equals("detail.id matches adminB.id", detail.id, adminB.id);
  TestValidator.equals(
    "detail.email matches adminB.email",
    detail.email,
    adminB.email,
  );
  TestValidator.equals(
    "detail.display_name matches adminB.display_name",
    detail.display_name ?? null,
    adminB.display_name ?? null,
  );
  TestValidator.equals(
    "detail.status matches adminB.status",
    detail.status,
    adminB.status,
  );
  TestValidator.equals(
    "detail.failed_login_count matches adminB.failed_login_count",
    detail.failed_login_count,
    adminB.failed_login_count,
  );
  TestValidator.equals(
    "detail.last_login_at matches adminB.last_login_at",
    detail.last_login_at ?? null,
    adminB.last_login_at ?? null,
  );
  TestValidator.equals(
    "detail.created_at matches adminB.created_at",
    detail.created_at,
    adminB.created_at,
  );
  TestValidator.equals(
    "detail.updated_at matches adminB.updated_at",
    detail.updated_at,
    adminB.updated_at,
  );
  TestValidator.equals(
    "detail.deleted_at matches adminB.deleted_at",
    detail.deleted_at ?? null,
    adminB.deleted_at ?? null,
  );

  // 5. Ensure Admin A and the fetched detail record are different accounts
  TestValidator.notEquals(
    "detail.id must differ from adminA.id",
    detail.id,
    adminA.id,
  );
  TestValidator.notEquals(
    "detail.email must differ from adminA.email",
    detail.email,
    adminA.email,
  );
}
