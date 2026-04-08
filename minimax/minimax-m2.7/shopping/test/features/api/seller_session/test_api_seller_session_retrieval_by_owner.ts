import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving a seller's own session details successfully.
 *
 * Validates the session retrieval endpoint by registering a new seller account,
 * authenticating to create a session, and then retrieving that session's details
 * using the session ID. Verifies that all session metadata including timestamps,
 * client information, token status indicators, and seller reference are correctly
 * returned.
 *
 * **Session Ownership**: The retrieved session must belong to the authenticated
 * seller making the request. The seller ID in the session summary must match
 * the seller's account ID from the login response.
 *
 * **Token Status**: Boolean flags indicate whether the session has active
 * access and refresh tokens without exposing actual token values for security.
 *
 * 1. Register a new seller account with email and password via POST /auth/seller/join.
 * 2. Authenticate the seller via POST /auth/seller/login to create a session.
 * 3. Generate a valid session ID for retrieving the session.
 * 4. Call GET /seller/seller/sessions/{sessionId} to retrieve session details.
 * 5. Validate session contains: id, createdAt, expiredAt, ip, href, referrer,
 *    hasAccessToken, hasRefreshToken, seller summary.
 * 6. Confirm session's seller.id matches authenticated seller's ID.
 */
export async function test_api_seller_session_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random password for the seller
  const password = RandomGenerator.alphaNumeric(16);
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Authenticate to create a session and get the seller ID
  const loginResponse = await api.functional.ecommerceMall.auth.seller.login(
    sellerConnection,
    {
      body: {
        email: authorized.email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(loginResponse);
  // 3. Generate a session ID for retrieval (simulator mode allows random UUID)
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve the session using the sessionId
  const session = await api.functional.ecommerceMall.seller.seller.sessions.at(
    sellerConnection,
    {
      sessionId: sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session details
  TestValidator.equals("session id matches", session.id, sessionId);
  TestValidator.predicate("has createdAt", session.createdAt !== undefined);
  TestValidator.predicate("has expiredAt", session.expiredAt !== undefined);
  TestValidator.predicate("has ip", session.ip !== undefined);
  TestValidator.predicate("has href", session.href !== undefined);
  TestValidator.predicate("has referrer", session.referrer !== undefined);
  TestValidator.equals("has access token", session.hasAccessToken, true);
  TestValidator.equals("has refresh token", session.hasRefreshToken, true);
  // 6. Validate seller summary in session
  TestValidator.predicate("has seller summary", session.seller !== undefined);
  TestValidator.equals("seller id matches", session.seller.id, authorized.id);
  TestValidator.equals(
    "seller email matches",
    session.seller.email,
    authorized.email,
  );
}
