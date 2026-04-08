import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_session_bulk_invalidation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: "Need admin access for session management testing",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(admin);
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: admin.email,
      password: "1234",
      href: "http://localhost:3000/admin",
      referrer: "http://localhost:3000",
    },
  });
  // 2. Seller setup - join and login (first session)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = "TestPass123!";
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      href: "http://localhost:3000/seller",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(seller);
  // 3. First seller login - creates first session
  const sellerLoginConnection1: api.IConnection = { host: connection.host };
  const firstLogin = await authorize_seller_login(sellerLoginConnection1, {
    body: {
      email: seller.email,
      password: sellerPassword,
    },
  });
  typia.assert(firstLogin);
  // Store first session info
  const firstSessionToken = firstLogin.token;
  // 4. Second seller login - creates second session (to have multiple sessions)
  const sellerLoginConnection2: api.IConnection = { host: connection.host };
  const secondLogin = await authorize_seller_login(sellerLoginConnection2, {
    body: {
      email: seller.email,
      password: sellerPassword,
    },
  });
  typia.assert(secondLogin);
  // 5. Admin bulk invalidates seller sessions (no specific sessionIds, no sessionId to preserve)
  const invalidateResponse =
    await api.functional.ecommerceMall.admin.sellers.sessions.invalidate(
      adminLoginConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IEcommerceMallSellerSession.IInvalidateRequest,
      },
    );
  typia.assert(invalidateResponse);
  // 6. Validate response format
  TestValidator.equals(
    "response has sessionIds array",
    Array.isArray(invalidateResponse.sessionIds),
    true,
  );
  TestValidator.predicate(
    "count is non-negative integer",
    invalidateResponse.count >= 0,
  );
  TestValidator.equals(
    "count matches sessionIds length",
    invalidateResponse.count,
    invalidateResponse.sessionIds.length,
  );
  // 7. Verify count reflects actual invalidations (at least 1 session should be invalidated)
  TestValidator.predicate(
    "at least one session invalidated",
    invalidateResponse.count >= 1,
  );
  // 8. Verify seller can still login with fresh credentials (new session works)
  const sellerLoginConnection3: api.IConnection = { host: connection.host };
  const thirdLogin = await authorize_seller_login(sellerLoginConnection3, {
    body: {
      email: seller.email,
      password: sellerPassword,
    },
  });
  typia.assert(thirdLogin);
  // Verify new login succeeded with valid token structure
  TestValidator.predicate(
    "new session has access token",
    thirdLogin.token.access.length > 0,
  );
  TestValidator.predicate(
    "new session has refresh token",
    thirdLogin.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "session expiration is future date",
    new Date(thirdLogin.token.expired_at) > new Date(),
  );
}
