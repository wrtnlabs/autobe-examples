import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test that an administrator can retrieve a seller's authentication session details.
 *
 * Validates the complete session retrieval flow for administrative oversight.
 * An administrator registers, a seller registers with explicit session context
 * values (creating an initial session automatically), and the administrator
 * retrieves that session by seller and session identifiers.
 *
 * The test confirms that all security-audit metadata fields are correctly
 * populated: the session's UUID identifier, associated seller summary (id,
 * email, approval_status, suspended/banned flags, created_at, and nested shop
 * profile), client IP address, page URL (href), HTTP referrer, creation
 * timestamp, and expiration timestamp.
 *
 * 1. Administrator registers via authorize_admin_join to gain admin access.
 * 2. Seller registers with explicit href, referrer, and ip values for audit validation.
 * 3. Session ID is decoded from the JWT access token's sub claim.
 * 4. Administrator retrieves the session record via the admin sellers sessions endpoint.
 * 5. Validates session fields match the seller identity and join input values.
 */
export async function test_api_seller_session_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Register seller with explicit session context values
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinHref = "https://shop.example.com/seller/register";
  const joinReferrer = "https://google.com/search";
  const joinIp = "192.168.1.100";
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      href: joinHref,
      referrer: joinReferrer,
      ip: joinIp,
    },
  });
  typia.assert(sellerAuthorized);
  // 3. Decode JWT access token to extract session ID
  const tokenParts = sellerAuthorized.token.access.split(".");
  const payloadBase64 = tokenParts[1].replace(/-/g, "+").replace(/_/g, "/");
  const payload = JSON.parse(
    Buffer.from(payloadBase64, "base64").toString("utf-8"),
  );
  const sessionId: string = payload.sub;
  // 4. Administrator retrieves the seller session
  const session = await api.functional.shoppingMall.admin.sellers.sessions.at(
    adminConnection,
    {
      sellerId: sellerAuthorized.id,
      sessionId,
    },
  );
  typia.assert(session);
  // 5. Validate session identity matches the registered seller
  TestValidator.equals(
    "session seller id",
    session.seller.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "session seller email",
    session.seller.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "session approval status",
    session.seller.approval_status,
    "pending",
  );
  TestValidator.predicate(
    "session seller not suspended",
    !session.seller.suspended,
  );
  TestValidator.predicate("session seller not banned", !session.seller.banned);
  // 6. Validate session audit metadata matches join input
  TestValidator.equals("session href", session.href, joinHref);
  TestValidator.equals("session referrer", session.referrer, joinReferrer);
  TestValidator.equals("session ip", session.ip, joinIp);
  // 7. Validate session timestamps are well-formed
  TestValidator.predicate(
    "session expired after created",
    new Date(session.expired_at).getTime() >
      new Date(session.created_at).getTime(),
  );
  TestValidator.predicate(
    "seller registered before or at session creation",
    new Date(session.seller.created_at).getTime() <=
      new Date(session.created_at).getTime(),
  );
}
