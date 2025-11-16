import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAuthCredential } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredential";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that an authenticated platform administrator can retrieve their own
 * authentication credential metadata via the dedicated credentials endpoint.
 *
 * Business flow:
 *
 * 1. Register a fresh platform admin using POST /auth/platformAdmin/join.
 *
 *    - Send a realistic IShoppingMallPlatformAdminJoin.IRequest payload with unique
 *         email, display name, password, and session context (href, referrer,
 *         optional ip).
 *    - The join call returns IShoppingMallPlatformAdmin.IAuthorized and also
 *         configures the Authorization header on the shared connection,
 *         establishing an authenticated platformAdmin session.
 * 2. Immediately call GET
 *    /shoppingMall/platformAdmin/platformAdmins/{platformAdminId}/credentials
 *    using api.functional.shoppingMall.platformAdmin.platformAdmins
 *    .credentials.at, with platformAdminId set to the id from the join
 *    response.
 * 3. Assert the response structurally using typia.assert to ensure it conforms to
 *    IShoppingMallAuthCredential.ISummary.
 * 4. Perform key business validations using TestValidator:
 *
 *    - Actor_type is exactly "platformAdmin".
 *    - Actor_id equals the platform admin id from the join response.
 *    - Identifier equals the email used at join.
 *    - Is_active is true for a newly joined admin.
 *    - Is_disabled is false for a newly joined admin.
 *    - Risk_flags, when present, is an array (typia.assert already guarantees
 *         structural correctness, so we only need lightweight logical checks
 *         like length >= 0).
 * 5. Do not inspect or rely on any sensitive credential material such as password
 *    hashes or raw token strings, as these are not part of
 *    IShoppingMallAuthCredential.ISummary by design.
 */
export async function test_api_platform_admin_credentials_view_by_self(
  connection: api.IConnection,
) {
  // 1. Register a fresh platform administrator via join API.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const joinBody = {
    email,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    // Optional ip left undefined to allow backend to infer it when possible.
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://shoppingmall.local/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const authorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  const platformAdminId: string & tags.Format<"uuid"> = authorized.id;

  // 2. Call the credentials endpoint for the same platform admin.
  const credentialSummary: IShoppingMallAuthCredential.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.credentials.at(
      connection,
      {
        platformAdminId,
      },
    );
  typia.assert(credentialSummary);

  // 3. Business logic validations.
  TestValidator.equals(
    "credential actor_type must be platformAdmin",
    credentialSummary.actor_type,
    "platformAdmin",
  );

  TestValidator.equals(
    "credential actor_id must equal platform admin id",
    credentialSummary.actor_id,
    platformAdminId,
  );

  TestValidator.equals(
    "credential identifier must match admin email",
    credentialSummary.identifier,
    email,
  );

  TestValidator.predicate(
    "credential is_active should be true for fresh admin",
    credentialSummary.is_active === true,
  );

  TestValidator.predicate(
    "credential is_disabled should be false for fresh admin",
    credentialSummary.is_disabled === false,
  );

  // risk_flags is optional; typia.assert already validated structure.
  // Here we just assert that, when present, it behaves as an array with
  // non-negative length, focusing on basic logical expectations.
  if (credentialSummary.risk_flags !== undefined) {
    TestValidator.predicate(
      "risk_flags, when present, must be a non-negative-length array",
      Array.isArray(credentialSummary.risk_flags) &&
        credentialSummary.risk_flags.length >= 0,
    );
  }
}
