import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
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
 * Test that a seller can retrieve a session created during login.
 *
 * 1. Create a seller account via join
 * 2. Login to create an authenticated session
 * 3. Extract session ID from the JWT token payload (jti claim)
 * 4. Retrieve session details via GET /ecommerceMall/seller/sessions/{sessionId}
 * 5. Validate the session belongs to the logged-in seller
 */
export async function test_api_seller_session_retrieve_after_login(
  connection: api.IConnection,
): Promise<void> {
  // Generate random seller credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // Create seller connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Join (create seller account)
  await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: null,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 2: Login (create new session)
  const authorized = await authorize_seller_login(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Step 3: Extract sessionId from JWT token payload
  // JWT structure: header.payload.signature, payload is base64url encoded
  const tokenParts = authorized.token.access.split(".");
  if (tokenParts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }
  // Decode base64url to base64 then to string
  const base64Payload = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(
    Buffer.from(base64Payload, "base64").toString("utf-8"),
  );
  const sessionId: string | undefined = payload.jti;
  if (!sessionId) {
    throw new Error("Session ID (jti) not found in token payload");
  }
  // Step 4: Retrieve the session
  const session = await api.functional.ecommerceMall.seller.sessions.at(
    sellerConnection,
    {
      sessionId,
    },
  );
  // Step 5: Validate session structure - typia.assert validates all types, formats, and constraints
  typia.assert(session);
  // Step 6: Business logic validations only (not type validation, which is handled by typia)
  TestValidator.equals(
    "session seller ID matches logged-in seller",
    session.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "session seller email matches",
    session.seller.email,
    authorized.email,
  );
  TestValidator.equals("session href matches registration", session.href, href);
  TestValidator.equals(
    "session referrer matches registration",
    session.referrer,
    referrer,
  );
}
