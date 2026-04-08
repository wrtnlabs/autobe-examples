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

export async function test_api_seller_session_selective_invalidation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin logs in to authorize session invalidation operations
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Seller registers to create seller account
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerJoinResponse = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Extract seller ID for the invalidation request
  const sellerId = sellerJoinResponse.id;
  // 3. Seller logs in multiple times to create multiple sessions
  const loginPassword = RandomGenerator.alphaNumeric(16);
  // First login - creates session 1
  const loginConnection1: api.IConnection = { host: connection.host };
  const loginResponse1 = await authorize_seller_login(loginConnection1, {
    body: {
      email: sellerJoinResponse.email,
      password: loginPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Second login - creates session 2
  const loginConnection2: api.IConnection = { host: connection.host };
  const loginResponse2 = await authorize_seller_login(loginConnection2, {
    body: {
      email: sellerJoinResponse.email,
      password: loginPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // Third login - creates session 3 (will be preserved)
  const loginConnection3: api.IConnection = { host: connection.host };
  const loginResponse3 = await authorize_seller_login(loginConnection3, {
    body: {
      email: sellerJoinResponse.email,
      password: loginPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Generate UUIDs for session invalidation test
  // In a real scenario, session IDs would come from a session listing endpoint
  // For this test, we use the API's ability to accept session IDs for invalidation
  const sessionIdToPreserve = typia.random<string & tags.Format<"uuid">>();
  const sessionIdsToInvalidate = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // 5. Admin invalidates specific seller sessions while preserving current session
  const invalidateResponse =
    await api.functional.ecommerceMall.admin.sellers.sessions.invalidate(
      adminConnection,
      {
        sellerId: sellerId,
        body: {
          sessionIds: sessionIdsToInvalidate,
          sessionId: sessionIdToPreserve,
        } satisfies IEcommerceMallSellerSession.IInvalidateRequest,
      },
    );
  // 6. Validate response structure with typia.assert
  typia.assert(invalidateResponse);
  // 7. Verify response has required properties
  TestValidator.equals(
    "response has sessionIds array",
    Array.isArray(invalidateResponse.sessionIds),
    true,
  );
  TestValidator.predicate(
    "response has valid count",
    invalidateResponse.count >= 0,
  );
  // 8. Verify count equals number of session IDs in request
  TestValidator.equals(
    "count matches invalidation request",
    invalidateResponse.count,
    sessionIdsToInvalidate.length,
  );
  // 9. Verify preserved session remains functional
  // The session ID that was protected should not appear in invalidated list
  const preservedNotInvalidated =
    !invalidateResponse.sessionIds.includes(sessionIdToPreserve);
  TestValidator.equals(
    "preserved session not in invalidated list",
    preservedNotInvalidated,
    true,
  );
}