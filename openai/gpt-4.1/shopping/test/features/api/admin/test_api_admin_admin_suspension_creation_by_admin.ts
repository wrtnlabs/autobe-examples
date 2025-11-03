import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAdminSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdminSuspension";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test that a platform administrator can successfully create a new admin
 * suspension record for another admin actor. The scenario includes the full
 * administrative workflow: authenticating as an admin, submitting the
 * suspension creation request with all required context (target actor, type,
 * reason, duration), and verifying that a new suspension entry is created and
 * returned in the response. The test must validate business rules such as not
 * suspending oneself and preventing duplicate or invalid suspensions. The
 * expected outcome is a suspension entry reflecting all provided context and
 * audit traceability.
 */
export async function test_api_admin_admin_suspension_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register two admin accounts (issuer and target)
  const issuerEmail = `${RandomGenerator.alphabets(8)}@company.com`;
  const targetEmail = `${RandomGenerator.alphabets(8)}@company.com`;
  const password = RandomGenerator.alphaNumeric(12);
  const name1 = RandomGenerator.name();
  const name2 = RandomGenerator.name();

  const issuerAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: issuerEmail,
      password: password,
      name: name1,
      role: "super", // assuming 'super' is a valid role for suspension authority
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(issuerAdmin);
  const targetAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: targetEmail,
      password: password,
      name: name2,
      role: "support", // target gets a different role
      status: "active",
    } satisfies IShoppingAdmin.IJoin,
  });
  typia.assert(targetAdmin);

  // 2. Authenticate as issuer admin (token managed automatically)

  // 3. Construct valid suspension creation body
  const now = new Date();
  const startAt = now.toISOString();
  const endAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days later
  const body = {
    admin_id: issuerAdmin.id,
    suspended_admin_id: targetAdmin.id,
    suspended_seller_id: null,
    suspended_customer_id: null,
    suspension_type: RandomGenerator.pick([
      "temporary",
      "permanent",
      "pending_appeal",
    ] as const),
    reason: RandomGenerator.paragraph({ sentences: 6 }),
    start_at: startAt,
    end_at: endAt,
    status: "active",
  } satisfies IShoppingAdminSuspension.ICreate;

  // 4. Create the suspension
  const suspension =
    await api.functional.shopping.admin.adminSuspensions.create(connection, {
      body,
    });
  typia.assert(suspension);
  TestValidator.equals(
    "suspension admin id",
    suspension.admin_id,
    issuerAdmin.id,
  );
  TestValidator.equals(
    "suspended_admin_id",
    suspension.suspended_admin_id,
    targetAdmin.id,
  );
  TestValidator.equals(
    "suspension type",
    suspension.suspension_type,
    body.suspension_type,
  );
  TestValidator.equals("reason matches", suspension.reason, body.reason);
  TestValidator.equals("status is active", suspension.status, "active");
  TestValidator.predicate(
    "created timestamps present",
    Boolean(suspension.created_at) && Boolean(suspension.updated_at),
  );

  // 5. Error: Cannot suspend self
  await TestValidator.error("admin cannot suspend themselves", async () => {
    await api.functional.shopping.admin.adminSuspensions.create(connection, {
      body: {
        ...body,
        suspended_admin_id: issuerAdmin.id,
      },
    });
  });

  // 6. Error: Duplicate suspension (should fail for already-suspended target admin)
  await TestValidator.error(
    "cannot create duplicate admin suspension",
    async () => {
      await api.functional.shopping.admin.adminSuspensions.create(connection, {
        body,
      });
    },
  );
}
