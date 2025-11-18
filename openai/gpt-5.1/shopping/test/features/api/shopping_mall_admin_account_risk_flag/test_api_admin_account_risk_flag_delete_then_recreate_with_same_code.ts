import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that deleting an account risk flag frees its business code for reuse
 * and that a newly created flag with the same code is an independent record.
 *
 * Business flow:
 *
 * 1. Register an admin (POST /auth/admin/join) and establish an authenticated
 *    connection.
 * 2. Create an account risk flag with a specific `code` via POST
 *    /shoppingMall/admin/accountRiskFlags.
 * 3. Delete that risk flag using DELETE
 *    /shoppingMall/admin/accountRiskFlags/{riskFlagId}.
 * 4. Re-create a new risk flag using the same `code`.
 * 5. Assert that:
 *
 *    - The second creation succeeds.
 *    - The new flag has a different `id`.
 *    - The `code` matches the reused value.
 *    - The lifecycle fields (e.g., `created_at`) differ, indicating a fresh record.
 */
export async function test_api_admin_account_risk_flag_delete_then_recreate_with_same_code(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create initial risk flag with a specific code
  const actorType = "customer";
  const riskCode = "TEMP_MANUAL_REVIEW";
  const initialSeverity = "medium";

  const firstRiskCreateBody = {
    actor_type: actorType,
    code: riskCode,
    reason:
      "Initial temporary manual review flag for testing delete & recreate.",
    severity: initialSeverity,
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const firstRiskFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: firstRiskCreateBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(firstRiskFlag);

  TestValidator.equals(
    "first risk flag code matches input",
    firstRiskFlag.code,
    riskCode,
  );
  TestValidator.equals(
    "first risk flag actor_type matches input",
    firstRiskFlag.actor_type,
    actorType,
  );
  TestValidator.equals(
    "first risk flag severity matches input",
    firstRiskFlag.severity,
    initialSeverity,
  );
  TestValidator.equals(
    "first risk flag should be active",
    firstRiskFlag.active,
    true,
  );

  // 3. Delete the created risk flag by id
  await api.functional.shoppingMall.admin.accountRiskFlags.erase(connection, {
    riskFlagId: firstRiskFlag.id,
  });

  // 4. Re-create a new risk flag with the same code but different severity/reason
  const recreatedSeverity = "high";
  const secondRiskCreateBody = {
    actor_type: actorType,
    code: riskCode,
    reason: "Recreated manual review flag after deletion with same code.",
    severity: recreatedSeverity,
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const secondRiskFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: secondRiskCreateBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(secondRiskFlag);

  // 5. Validate reuse of code and independence of the new record
  TestValidator.equals(
    "second risk flag code should equal reused code",
    secondRiskFlag.code,
    riskCode,
  );
  TestValidator.equals(
    "second risk flag actor_type matches input",
    secondRiskFlag.actor_type,
    actorType,
  );
  TestValidator.equals(
    "second risk flag severity reflects updated value",
    secondRiskFlag.severity,
    recreatedSeverity,
  );
  TestValidator.equals(
    "second risk flag should be active",
    secondRiskFlag.active,
    true,
  );

  TestValidator.notEquals(
    "recreated risk flag must have different id from deleted one",
    secondRiskFlag.id,
    firstRiskFlag.id,
  );
  TestValidator.notEquals(
    "recreated risk flag should have different created_at timestamp",
    secondRiskFlag.created_at,
    firstRiskFlag.created_at,
  );
}
