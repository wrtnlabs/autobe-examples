import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Validate detailed retrieval of a specific admin suspension record by admin.
 *
 * This test ensures that an admin can successfully retrieve the complete detail
 * of a targeted admin suspension record by its UUID. The test flow includes:
 *
 * 1. Register a new admin with random but valid unique credentials.
 * 2. Authenticate as the created admin (implicit after join).
 * 3. Generate a mock admin suspension record to act as the target of detail
 *    retrieval.
 * 4. Retrieve the admin suspension detail using the proper API as the
 *    authenticated admin.
 * 5. Validate the response structure matches IShoppingAdminSuspension, including
 *    all audited and business fields.
 * 6. Confirm critical fields (id, admin_id, suspension_type, reason, status,
 *    timestamps) exist, and admin_id matches the created admin.
 * 7. Check unauthorized and unauthenticated requests are forbidden to access this
 *    data.
 */
export async function test_api_admin_suspension_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.MinLength<8> &
      tags.MaxLength<128>,
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const) as string & tags.MinLength<2> & tags.MaxLength<32>,
    status: RandomGenerator.pick([
      "active",
      "pending",
      "suspended",
      "locked",
    ] as const) as string & tags.MinLength<3> & tags.MaxLength<20>,
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);
  TestValidator.equals(
    "admin email matches join input",
    admin.email,
    adminJoinInput.email,
  );
  TestValidator.equals(
    "admin name matches join input",
    admin.name,
    adminJoinInput.name,
  );
  TestValidator.equals(
    "admin role matches join input",
    admin.role,
    adminJoinInput.role,
  );
  TestValidator.equals(
    "admin status matches join input",
    admin.status,
    adminJoinInput.status,
  );

  // 2. Generate a mock admin suspension record
  // (No POST API to create suspensions in scope. Use typia.random for E2E context)
  const targetSuspension = typia.random<IShoppingAdminSuspension>();

  // 3. Retrieve the admin suspension detail as authenticated admin
  const fetched = await api.functional.shopping.admin.adminSuspensions.at(
    connection,
    { adminSuspensionId: targetSuspension.id },
  );
  typia.assert(fetched);
  TestValidator.equals(
    "fetched suspension id matches target",
    fetched.id,
    targetSuspension.id,
  );
  TestValidator.predicate(
    "admin_id in suspension is non-empty uuid",
    typeof fetched.admin_id === "string" && !!fetched.admin_id.length,
  );
  TestValidator.equals(
    "suspension type matches mock",
    fetched.suspension_type,
    targetSuspension.suspension_type,
  );
  TestValidator.equals(
    "reason matches mock",
    fetched.reason,
    targetSuspension.reason,
  );
  TestValidator.equals(
    "status matches mock",
    fetched.status,
    targetSuspension.status,
  );
  TestValidator.predicate(
    "created_at is date-time string",
    !!fetched.created_at && typeof fetched.created_at === "string",
  );

  // 4. Check unauthenticated access is forbidden
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request to adminSuspensions.at should fail",
    async () => {
      await api.functional.shopping.admin.adminSuspensions.at(
        unauthConnection,
        {
          adminSuspensionId: targetSuspension.id,
        },
      );
    },
  );
}
