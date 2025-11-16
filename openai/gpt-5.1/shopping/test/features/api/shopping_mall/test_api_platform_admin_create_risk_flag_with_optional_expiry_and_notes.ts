import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_platform_admin_create_risk_flag_with_optional_expiry_and_notes(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a syntactically valid authCredentialsId.
  const authCredentialsId = typia.random<string & tags.Format<"uuid">>();

  // 3. Construct risk flag creation payload with optional expiresAt and notes.
  const expiresAtDate = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const createBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    expiresAt: expiresAtDate,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  // 4. Call risk flag creation endpoint.
  const created: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(created);

  // 5. Business validations.
  TestValidator.equals(
    "risk flag code should match request",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "risk flag reasonCategory should match request",
    created.reasonCategory,
    createBody.reasonCategory,
  );
  TestValidator.equals(
    "risk flag riskLevel should match request",
    created.riskLevel,
    createBody.riskLevel,
  );
  TestValidator.equals(
    "risk flag message should match request",
    created.message,
    createBody.message,
  );
  TestValidator.equals(
    "risk flag active should match request",
    created.active,
    createBody.active,
  );

  TestValidator.equals(
    "risk flag expiresAt should be set and match request",
    created.expiresAt,
    createBody.expiresAt,
  );
  TestValidator.equals(
    "risk flag notes should be set and match request",
    created.notes,
    createBody.notes,
  );

  // clearedAt should be null or undefined for a newly created active flag.
  TestValidator.predicate(
    "clearedAt should be nullish for new active risk flag",
    created.clearedAt === null || created.clearedAt === undefined,
  );
}
