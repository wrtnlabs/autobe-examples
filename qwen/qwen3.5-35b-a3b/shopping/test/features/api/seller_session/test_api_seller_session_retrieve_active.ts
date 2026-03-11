import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
 * Test seller session retrieval for active seller sessions.
 * 1. Seller joins platform via POST /ecommerceMall/auth/seller/join
 * 2. Retrieve session details via GET /ecommerceMall/seller/sessions/{sessionId}
 * 3. Validate session belongs to authenticated seller
 */
export async function test_api_seller_session_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create seller account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 2. The access token IS the session identifier for this API
  const sessionId: string = authorized.token.access;
  typia.assert(sessionId);
  // 3. Setup authenticated seller connection for session retrieval
  // Create new connection with proper Authorization header
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 4. Retrieve session details using the authenticated connection
  const session = await api.functional.ecommerceMall.seller.sessions.at(
    sellerConnection,
    {
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session structure
  TestValidator.equals(
    "session id matches authenticated session",
    session.id,
    sessionId,
  );
  TestValidator.equals(
    "seller id matches authenticated seller",
    session.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "seller email matches authenticated seller",
    session.seller.email,
    authorized.email,
  );
  // 6. Validate timestamps are ISO 8601 format
  TestValidator.predicate(
    "created_at is valid date-time format",
    () => !isNaN(new Date(session.created_at).getTime()),
  );
  TestValidator.predicate(
    "expired_at is valid date-time format",
    () => !isNaN(new Date(session.expired_at).getTime()),
  );
  // 7. Validate session is active (expired_at is in the future)
  const now = new Date();
  const expiredAt = new Date(session.expired_at);
  TestValidator.predicate(
    "session is active (not expired)",
    () => expiredAt > now,
  );
  // 8. Validate connection metadata is recorded
  TestValidator.equals("ip address is recorded", typeof session.ip, "string");
  TestValidator.equals(
    "href (user-agent) is recorded",
    typeof session.href,
    "string",
  );
  TestValidator.equals(
    "referrer is recorded",
    typeof session.referrer,
    "string",
  );
  // 9. Validate seller summary fields
  TestValidator.predicate(
    "seller has approval status",
    () =>
      session.seller.approvalStatus === "pending" ||
      session.seller.approvalStatus === "approved" ||
      session.seller.approvalStatus === "rejected",
  );
  TestValidator.equals(
    "seller suspension status is boolean",
    typeof session.seller.isSuspended,
    "boolean",
  );
  TestValidator.equals(
    "seller ban status is boolean",
    typeof session.seller.isBanned,
    "boolean",
  );
}
