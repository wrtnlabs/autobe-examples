import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate basic creation of an account risk flag by an authenticated admin.
 *
 * Business flow:
 *
 * 1. Register a fresh admin via POST /auth/admin/join to establish an
 *    authenticated admin context and let the SDK attach the access token into
 *    the shared connection.
 * 2. As that admin, call POST /shoppingMall/admin/accountRiskFlags with the
 *    minimal required IShoppingMallAccountRiskFlag.ICreate fields (actor_type,
 *    code, severity, active) to create a basic risk flag, intentionally
 *    omitting optional nullable fields (reason, expires_at).
 * 3. Assert that the response is a well-formed IShoppingMallAccountRiskFlag and
 *    that its business fields mirror the request while system-managed fields
 *    (id, created_at, updated_at, deleted_at) are correctly initialized.
 *
 * Technical notes:
 *
 * - Authorization: rely on api.functional.auth.admin.join to mutate
 *   connection.headers.Authorization; do not touch headers manually.
 * - Type safety: use `satisfies` for request DTOs and `typia.assert` on
 *   responses; never use `as any` or wrong-type payloads.
 * - No follow-up GET is performed because a dedicated GET endpoint for the
 *   created risk flag is not provided in the available SDK.
 */
export async function test_api_account_risk_flag_creation_basic_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a fresh admin and obtain an authenticated context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Basic sanity check on admin identity to ensure join succeeded.
  TestValidator.predicate(
    "admin join should return non-empty admin id",
    adminAuthorized.id.length > 0,
  );

  // 2. Create a minimal account risk flag as this authenticated admin.
  const createBody = {
    actor_type: "customer",
    code: "HIGH_REFUND_RATE",
    severity: "high",
    active: true,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const created: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAccountRiskFlag>(created);

  // 3. Business-level validations on the created risk flag.
  TestValidator.equals(
    "created risk flag actor_type should match request",
    created.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "created risk flag code should match request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created risk flag severity should match request",
    created.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "created risk flag active should be true as requested",
    created.active,
    createBody.active,
  );

  // Ensure ID is non-empty; UUID format is already enforced by typia.assert.
  TestValidator.predicate(
    "created risk flag id should be a non-empty string",
    created.id.length > 0,
  );

  // created_at and updated_at are validated by typia, but we still
  // ensure they are present (non-empty) for business expectations.
  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    created.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    created.updated_at.length > 0,
  );

  // deleted_at should be null or undefined on creation.
  TestValidator.predicate(
    "deleted_at should be null or undefined on newly created risk flag",
    created.deleted_at === null || created.deleted_at === undefined,
  );
}
