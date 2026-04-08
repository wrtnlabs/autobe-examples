import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller session filtering by status (active/expired).
 *
 * Validates the session listing endpoint with status filter parameter.
 * Verifies that status='active' returns only non-expired sessions (expiredAt > current time)
 * and status='expired' returns only expired sessions (expiredAt <= current time).
 *
 * 1. Create and authenticate as an approved seller with known credentials.
 * 2. Login to create a new session.
 * 3. Query sessions with status='active' filter.
 * 4. Validate only active sessions are returned.
 * 5. Query sessions with status='expired' filter.
 * 6. Validate only expired sessions are returned.
 * 7. Verify active and expired sessions are mutually exclusive.
 */
export async function test_api_seller_sessions_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  const testEmail = typia.random<string & tags.Format<"email">>();
  const testPassword = RandomGenerator.alphaNumeric(16);
  // 1. Create seller with known credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: "https://example.com/join",
      referrer: "https://example.com",
    },
  });
  // 2. Login to create a session
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(loginConnection, {
    body: {
      email: testEmail,
      password: testPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Query sessions with status='active' filter
  const activeSessionsResponse =
    await api.functional.ecommerceMall.seller.seller.sessions.index(
      loginConnection,
      {
        body: {
          status: "active",
        } satisfies IEcommerceMallSellerSession.IRequest,
      },
    );
  typia.assert(activeSessionsResponse);
  // 4. Validate only active sessions are returned
  const currentTime = new Date();
  for (const session of activeSessionsResponse.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.equals(
      "session should be active",
      expiredAt > currentTime,
      true,
    );
  }
  // 5. Query sessions with status='expired' filter
  const expiredSessionsResponse =
    await api.functional.ecommerceMall.seller.seller.sessions.index(
      loginConnection,
      {
        body: {
          status: "expired",
        } satisfies IEcommerceMallSellerSession.IRequest,
      },
    );
  typia.assert(expiredSessionsResponse);
  // 6. Validate only expired sessions are returned (or empty if no expired sessions)
  for (const session of expiredSessionsResponse.data) {
    const expiredAt = new Date(session.expiredAt);
    TestValidator.equals(
      "session should be expired",
      expiredAt <= currentTime,
      true,
    );
  }
  // 7. Verify active and expired sessions are mutually exclusive
  const hasNoOverlap =
    activeSessionsResponse.data.length === 0 ||
    expiredSessionsResponse.data.length === 0 ||
    activeSessionsResponse.data.every(
      (active) =>
        !expiredSessionsResponse.data.some(
          (expired) => expired.id === active.id,
        ),
    );
  TestValidator.equals(
    "active and expired sessions should not overlap",
    hasNoOverlap,
    true,
  );
}
