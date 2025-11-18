import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_account_risk_flag_creation_with_optional_fields(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain authenticated context required for admin-only APIs
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
  typia.assert(adminAuthorized);

  // 2. Prepare risk flag create payload with optional fields populated
  const futureExpiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60 * 24,
  ).toISOString() as string & tags.Format<"date-time">;

  const reason: string = RandomGenerator.paragraph({
    sentences: 6,
    wordMin: 4,
    wordMax: 10,
  });

  const createBody = {
    actor_type: "seller",
    code: "SUSPICIOUS_LOGIN_PATTERN",
    reason,
    severity: "medium",
    active: true,
    expires_at: futureExpiresAt,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const createdFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdFlag);

  // 3. Validate that returned flag reflects provided payload
  TestValidator.equals(
    "actor_type should match input",
    createdFlag.actor_type,
    createBody.actor_type,
  );
  TestValidator.equals(
    "code should match input",
    createdFlag.code,
    createBody.code,
  );
  TestValidator.equals(
    "severity should match input",
    createdFlag.severity,
    createBody.severity,
  );
  TestValidator.equals(
    "active should match input",
    createdFlag.active,
    createBody.active,
  );
  TestValidator.equals(
    "reason should match input",
    createdFlag.reason ?? null,
    createBody.reason ?? null,
  );
  TestValidator.equals(
    "expires_at should match input",
    createdFlag.expires_at ?? null,
    createBody.expires_at ?? null,
  );

  // 4. created_at and updated_at should be set, deleted_at should be null or undefined
  TestValidator.predicate(
    "created_at is present",
    createdFlag.created_at !== undefined && createdFlag.created_at !== null,
  );

  TestValidator.predicate(
    "updated_at is present",
    createdFlag.updated_at !== undefined && createdFlag.updated_at !== null,
  );

  TestValidator.predicate(
    "deleted_at is null or undefined",
    createdFlag.deleted_at === null || createdFlag.deleted_at === undefined,
  );
}
