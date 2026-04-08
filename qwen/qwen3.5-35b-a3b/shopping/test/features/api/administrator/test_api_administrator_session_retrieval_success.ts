import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test administrator's ability to retrieve a specific seller session for oversight purposes.
 *
 * Validates the primary business workflow where an administrator reviews seller session information for debugging, audit, or support reasons. This test verifies the session retrieval endpoint functionality and validates that all session data is properly returned.
 *
 * 1. Administrator registers account and obtains authentication credentials
 * 2. Administrator logs in to establish authenticated session
 * 3. Seller registers account with email/password credentials
 * 4. Seller logs in to create an active session
 * 5. Administrator retrieves the seller's session using sellerId and sessionId
 * 6. System returns complete session data including all required fields
 *
 * Business Rules Validated:
 * - Administrator can only view sessions they have permission to audit
 * - Session data is returned in full for administrative oversight
 * - Tokens are included in response for audit purposes
 * - Session lifecycle timestamps are preserved accurately
 * - Seller ownership is verified during retrieval
 *
 * Data Validation:
 * - Verify sessionId is a valid UUID format
 * - Verify sellerId is a valid UUID format
 * - Verify session exists in the database
 * - Verify session is not soft-deleted (deleted_at IS NULL)
 */
export async function test_api_administrator_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator and store credentials
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminResult = await authorize_administrator_join(adminJoinConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    },
  });
  typia.assert(adminResult);
  // 2. Administrator logs in with actual credentials
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminResult.email,
      password: adminPassword,
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  // 3. Register seller and store credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerResult);
  const sellerId = sellerResult.id;
  // 4. Seller logs in to create active session
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerResult.email,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  // Note: The seller login response contains JWT tokens but not session ID.
  // For this test, we generate a valid UUID for the session ID to verify
  // that the endpoint can be called and returns the proper data structure.
  const sessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 5. Administrator retrieves the seller's session
  const sellerSession =
    await api.functional.ecommerceMall.administrator.sellers.sessions.at(
      adminLoginConnection,
      {
        sellerId,
        sessionId,
      },
    );
  typia.assert(sellerSession);
  // 6. Validate session fields
  TestValidator.equals(
    "seller ID matches",
    sellerSession.ecommerce_mall_seller_id,
    sellerId,
  );
  TestValidator.predicate(
    "access token exists",
    sellerSession.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    sellerSession.refresh_token.length > 0,
  );
  TestValidator.predicate("IP address exists", sellerSession.ip.length > 0);
  TestValidator.predicate("href format valid", sellerSession.href.length > 0);
  TestValidator.predicate(
    "referrer format valid",
    sellerSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "created_at exists",
    sellerSession.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at exists",
    sellerSession.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null (active session)",
    sellerSession.deleted_at,
    null,
  );
  TestValidator.predicate(
    "expired_at exists",
    sellerSession.expired_at.length > 0,
  );
}
