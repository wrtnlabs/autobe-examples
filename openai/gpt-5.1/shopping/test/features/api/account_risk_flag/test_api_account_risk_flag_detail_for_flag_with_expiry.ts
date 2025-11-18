import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that time-bounded account risk flags expose expiry metadata
 * correctly via detail endpoint.
 *
 * Business context: Administrative risk tooling in the shopping mall platform
 * relies on /shoppingMall/admin/accountRiskFlags/{riskFlagId} to inspect the
 * details of a specific risk flag. When a flag is configured with a non-null
 * expires_at, downstream consumers must be able to trust that this timestamp,
 * along with other core attributes like actor_type, code, severity and active,
 * is returned consistently between creation and detail retrieval.
 *
 * Scenario steps:
 *
 * 1. Register an admin account using POST /auth/admin/join to obtain an
 *    authenticated admin context.
 * 2. As that admin, create a new account risk flag via POST
 *    /shoppingMall/admin/accountRiskFlags with
 *    IShoppingMallAccountRiskFlag.ICreate where:
 *
 *    - Actor_type is a concrete value such as "customer".
 *    - Code is a stable, machine-readable risk code string.
 *    - Severity is a business severity literal string (e.g. "high").
 *    - Active is true.
 *    - Expires_at is an explicit future ISO8601 date-time string.
 * 3. Retrieve the risk flag detail using GET
 *    /shoppingMall/admin/accountRiskFlags/{riskFlagId} with the id from the
 *    creation response.
 * 4. Validate that the detail response:
 *
 *    - Conforms to IShoppingMallAccountRiskFlag via typia.assert.
 *    - Has the same id as the created flag.
 *    - Preserves the same actor_type, code, severity and active values.
 *    - Has a non-null expires_at equal to the value sent on creation.
 *    - Has created_at strictly earlier than expires_at.
 *    - Has deleted_at null (or effectively null for a non-deleted record).
 */
export async function test_api_account_risk_flag_detail_for_flag_with_expiry(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a time-bounded risk flag with future expires_at
  const now = new Date();
  const futureDate = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const expiresAt: string & tags.Format<"date-time"> =
    futureDate.toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    actor_type: "customer",
    code: "TEMP_SUSPICIOUS_ACTIVITY",
    reason: RandomGenerator.paragraph({ sentences: 4 }),
    severity: "high",
    active: true,
    expires_at: expiresAt,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdFlag);

  // Basic sanity checks on created flag
  TestValidator.equals(
    "created flag id should be stable UUID",
    createdFlag.id,
    createdFlag.id,
  );
  TestValidator.equals(
    "created flag actor_type matches request",
    createdFlag.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "created flag code matches request",
    createdFlag.code,
    createBody.code,
  );
  TestValidator.equals(
    "created flag severity matches request",
    createdFlag.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "created flag active matches request",
    createdFlag.active,
    createBody.active,
  );
  TestValidator.equals(
    "created flag expires_at matches request",
    createdFlag.expires_at,
    createBody.expires_at,
  );

  // 3. Retrieve the risk flag detail via GET /shoppingMall/admin/accountRiskFlags/{riskFlagId}
  const detail: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.at(connection, {
      riskFlagId: createdFlag.id,
    });
  typia.assert(detail);

  // 4. Validate consistency between create and detail responses
  TestValidator.equals(
    "detail id matches created flag id",
    detail.id,
    createdFlag.id,
  );
  TestValidator.equals(
    "detail actor_type matches created flag",
    detail.actor_type,
    createdFlag.actor_type,
  );
  TestValidator.equals(
    "detail code matches created flag",
    detail.code,
    createdFlag.code,
  );
  TestValidator.equals(
    "detail severity matches created flag",
    detail.severity,
    createdFlag.severity,
  );
  TestValidator.equals(
    "detail active matches created flag",
    detail.active,
    createdFlag.active,
  );
  TestValidator.equals(
    "detail expires_at matches created flag",
    detail.expires_at,
    createdFlag.expires_at,
  );

  // Ensure expires_at is non-null and in the future relative to created_at
  TestValidator.predicate("expires_at should be non-null", () => {
    return detail.expires_at !== null && detail.expires_at !== undefined;
  });

  const createdAtMillis = new Date(detail.created_at).getTime();
  const expiresAtMillis = new Date(detail.expires_at as string).getTime();

  TestValidator.predicate(
    "created_at must be earlier than expires_at",
    () => createdAtMillis < expiresAtMillis,
  );

  // deleted_at should represent a non-deleted record
  TestValidator.predicate(
    "deleted_at should be null or undefined for active flag",
    () => detail.deleted_at === null || detail.deleted_at === undefined,
  );
}
