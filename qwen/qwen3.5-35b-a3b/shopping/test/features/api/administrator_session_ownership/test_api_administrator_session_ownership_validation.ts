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
 * Test that the system validates session ownership when an administrator attempts to retrieve a session belonging to a different seller.
 *
 * Validates the foreign key constraint enforcement between sessions and sellers, ensuring that administrators cannot access sessions that don't belong to the seller ID specified in the path parameter. The test creates two sellers with independent sessions and verifies that cross-selling session access is denied with a 404 Not Found response.
 *
 * Special attention is given to verifying that the ecommerce_mall_seller_id foreign key relationship is strictly enforced, and that ownership validation prevents unauthorized session access across seller boundaries.
 *
 * 1. Administrator registers and authenticates to obtain admin session.
 * 2. Seller A registers and logs in to create Session A with sellerId A.
 * 3. Seller B registers and logs in to create Session B with sellerId B.
 * 4. Administrator attempts to retrieve Seller B's session (sessionId B) using Seller A's ID (sellerId A) as path parameter.
 * 5. System returns 404 Not Found because session belongs to different seller (ownership validation failure).
 * 6. Verify the foreign key relationship between session and seller is enforced.
 * 7. Verify that matching sellerId and sessionId returns the correct session (positive test).
 */
export async function test_api_administrator_session_ownership_validation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(16);
  const adminAuth: IEcommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        display_name: RandomGenerator.name(),
        email: adminEmail,
        password: adminPassword,
        grade: "regular",
      } satisfies IEcommerceMallAdministrator.IJoin,
    });
  typia.assert(adminAuth);
  const adminSessionConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminSessionConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  // 2. Seller A setup - create Session A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerAAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerAConnection, {
      body: {
        display_name: RandomGenerator.name(),
        email: sellerAEmail,
        password: sellerAPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerAAuth);
  const sellerALoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerALoginConnection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Store Seller A's ID for later use
  const sellerAId: string & tags.Format<"uuid"> = sellerAAuth.id;
  // 3. Seller B setup - create Session B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string = RandomGenerator.alphaNumeric(16);
  const sellerBAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerBConnection, {
      body: {
        display_name: RandomGenerator.name(),
        email: sellerBEmail,
        password: sellerBPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  typia.assert(sellerBAuth);
  const sellerBLoginConnection: api.IConnection = { host: connection.host };
  const sellerBLoginAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_login(sellerBLoginConnection, {
      body: {
        email: sellerBEmail,
        password: sellerBPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(sellerBLoginAuth);
  // Store Seller B's ID and Session B's ID
  const sellerBId: string & tags.Format<"uuid"> = sellerBLoginAuth.id;
  const sellerBSessionId: string & tags.Format<"uuid"> =
    sellerBLoginAuth.token.access;
  // 4. Test ownership validation: Try to access Seller B's session using Seller A's ID
  // This should return 404 because the session belongs to Seller B, not Seller A
  await TestValidator.error(
    "session ownership validation - cross-seller access denied",
    async () => {
      await api.functional.ecommerceMall.administrator.sellers.sessions.at(
        adminSessionConnection,
        {
          sellerId: sellerAId, // Wrong seller ID
          sessionId: sellerBSessionId, // Correct session ID but belongs to different seller
        },
      );
    },
  );
  // 5. Positive test: Access Seller B's session using Seller B's ID (should succeed)
  const correctSession: IEcommerceMallSellerSession =
    await api.functional.ecommerceMall.administrator.sellers.sessions.at(
      adminSessionConnection,
      {
        sellerId: sellerBId, // Correct seller ID
        sessionId: sellerBSessionId, // Correct session ID
      },
    );
  typia.assert(correctSession);
  // Verify the session belongs to the correct seller
  TestValidator.equals(
    "session belongs to correct seller",
    correctSession.ecommerce_mall_seller_id,
    sellerBId,
  );
}
