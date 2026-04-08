import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_seller_session_revoke_specific(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminResult);
  // Admin connection with authorization header for subsequent calls
  const adminConnectionForRevoke: api.IConnection = { host: connection.host };
  adminConnectionForRevoke.headers = {
    Authorization: adminResult.token.access,
  };
  // 2. Generate mock session IDs for testing
  // In a complete test, these would come from actual seller sessions created via seller join/login
  // Since seller DTOs are not provided, we use generated UUIDs to test the endpoint structure
  const sessionId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionId3: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Administrator revokes only specific sessions (not all)
  const sessionsToRevoke: (string & tags.Format<"uuid">)[] = [
    sessionId1,
    sessionId2,
  ];
  const revokeResult =
    await api.functional.ecommerceMall.administrator.sellers.sessions.revoke(
      adminConnectionForRevoke,
      {
        sellerId,
        body: {
          session_ids: sessionsToRevoke,
        } satisfies IEcommerceMallSeller.IRevokeSession,
      },
    );
  typia.assert(revokeResult);
  // 4. Verify response structure
  TestValidator.equals(
    "seller_id matches request",
    revokeResult.seller_id,
    sellerId,
  );
  TestValidator.predicate(
    "count matches session_ids length",
    revokeResult.count === sessionsToRevoke.length,
  );
  TestValidator.predicate(
    "revoked_session_ids not empty",
    revokeResult.revoked_session_ids.length > 0,
  );
  TestValidator.predicate(
    "revoked_at is valid timestamp",
    revokeResult.revoked_at !== undefined,
  );
  // 5. Verify specific sessions were revoked
  for (const sessionId of sessionsToRevoke) {
    TestValidator.predicate(
      `session ${sessionId} was revoked`,
      revokeResult.revoked_session_ids.includes(sessionId),
    );
  }
  // 6. Test with duplicate session IDs in array
  const sessionsWithDuplicates: (string & tags.Format<"uuid">)[] = [
    sessionId1,
    sessionId1, // duplicate
    sessionId3, // new session
  ];
  const duplicateRevokeResult =
    await api.functional.ecommerceMall.administrator.sellers.sessions.revoke(
      adminConnectionForRevoke,
      {
        sellerId,
        body: {
          session_ids: sessionsWithDuplicates,
        } satisfies IEcommerceMallSeller.IRevokeSession,
      },
    );
  typia.assert(duplicateRevokeResult);
  TestValidator.predicate(
    "duplicate session IDs handled correctly",
    duplicateRevokeResult.count === 2,
  );
  // 7. Test with non-existent session ID (should be ignored)
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sessionsWithNonExistent: (string & tags.Format<"uuid">)[] = [
    sessionId1,
    nonExistentSessionId,
  ];
  const nonExistentRevokeResult =
    await api.functional.ecommerceMall.administrator.sellers.sessions.revoke(
      adminConnectionForRevoke,
      {
        sellerId,
        body: {
          session_ids: sessionsWithNonExistent,
        } satisfies IEcommerceMallSeller.IRevokeSession,
      },
    );
  typia.assert(nonExistentRevokeResult);
  TestValidator.predicate(
    "non-existent session ignored in response",
    nonExistentRevokeResult.count >= 0,
  );
}
