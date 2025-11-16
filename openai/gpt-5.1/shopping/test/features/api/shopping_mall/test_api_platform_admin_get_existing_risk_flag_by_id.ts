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

/**
 * Validate that a platform administrator can retrieve an existing risk flag by
 * its id for a specific authCredentialsId, and that the ownership binding
 * between authCredentialsId and riskFlagId is preserved.
 *
 * Business context: Platform admins and security operators need to inspect
 * detailed risk flags attached to authentication credentials. The GET endpoint
 * must only return a risk flag when both the credential id and the flag id
 * match, ensuring no cross-credential leakage.
 *
 * Flow under test:
 *
 * 1. Join as a platform admin (POST /auth/platformAdmin/join). The SDK will
 *    automatically set the Authorization header on the shared connection.
 * 2. Generate a random UUID for authCredentialsId to represent the target
 *    credentials record. (In a full system this would be an actual
 *    shopping_mall_auth_credentials.id, but here we avoid depending on missing
 *    APIs.)
 * 3. Create a risk flag for that authCredentialsId via POST
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags
 *    using a valid IShoppingMallRiskFlag.ICreate body.
 * 4. Immediately fetch the same risk flag via GET
 *    /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags/{riskFlagId}.
 * 5. Validate that the retrieved IShoppingMallRiskFlag matches the created one on
 *    all core business fields and that the id/authCredentialsId binding is
 *    respected.
 */
export async function test_api_platform_admin_get_existing_risk_flag_by_id(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and obtain an authorized session
  const joinRequest = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin-console.example.com/join",
    referrer: "https://landing.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Prepare a synthetic authCredentialsId (UUID) to attach a risk flag to
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Construct a risk flag create body
  const expiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    code: "suspicious_login_pattern",
    reasonCategory: "suspected_fraud",
    riskLevel: "high",
    message: RandomGenerator.paragraph({ sentences: 6 }),
    active: true,
    expiresAt,
    notes: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallRiskFlag.ICreate;

  const created: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
      connection,
      {
        authCredentialsId,
        body: createBody,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(created);

  // Basic sanity checks on creation
  TestValidator.equals(
    "created risk flag has requested authCredentialsId",
    created.authCredentialsId,
    authCredentialsId,
  );

  // 4. Retrieve the same risk flag by id
  const fetched: IShoppingMallRiskFlag =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.at(
      connection,
      {
        authCredentialsId,
        riskFlagId: created.id,
      },
    );
  typia.assert<IShoppingMallRiskFlag>(fetched);

  // 5. Validate identity and ownership binding
  TestValidator.equals("fetched id matches created id", fetched.id, created.id);
  TestValidator.equals(
    "fetched authCredentialsId matches path and created record",
    fetched.authCredentialsId,
    authCredentialsId,
  );

  // 6. Validate core business fields echo
  TestValidator.equals("code is preserved", fetched.code, created.code);
  TestValidator.equals(
    "reasonCategory is preserved",
    fetched.reasonCategory,
    created.reasonCategory,
  );
  TestValidator.equals(
    "riskLevel is preserved",
    fetched.riskLevel,
    created.riskLevel,
  );
  TestValidator.equals(
    "message is preserved",
    fetched.message,
    created.message,
  );
  TestValidator.equals(
    "active flag is preserved",
    fetched.active,
    created.active,
  );
  TestValidator.equals(
    "expiresAt is preserved",
    fetched.expiresAt,
    created.expiresAt,
  );
  TestValidator.equals("notes are preserved", fetched.notes, created.notes);

  // 7. Validate timestamps
  TestValidator.equals(
    "createdAt is preserved",
    fetched.createdAt,
    created.createdAt,
  );

  // updatedAt should be same or later; we cannot compare Date objects here but can ensure string equality or difference
  TestValidator.predicate(
    "fetched.updatedAt is same as or later than created.updatedAt lexicographically",
    fetched.updatedAt >= created.updatedAt,
  );

  // 8. If credentials summary is present, ensure it matches the authCredentialsId
  if (fetched.credentials !== undefined) {
    typia.assert<IShoppingMallAuthCredentials.ISummary>(fetched.credentials);
    TestValidator.equals(
      "credentials.id equals authCredentialsId when present",
      fetched.credentials.id,
      authCredentialsId,
    );
  }
}
