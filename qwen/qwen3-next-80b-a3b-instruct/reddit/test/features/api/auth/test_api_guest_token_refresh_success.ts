import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_token_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest user to obtain valid refresh token
  const guestConnection: api.IConnection = { host: connection.host };
  const guestJoined: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityPlatformGuest.IJoin,
    });
  typia.assert(guestJoined);
  // Step 2: Extract refresh token from initial join response
  const refresh_token = guestJoined.token.refresh;
  const oldAccess = guestJoined.token.access;
  const oldRefreshableUntil = guestJoined.token.refreshable_until;
  const guestId = guestJoined.id;
  const createdAt = guestJoined.createdAt;
  const lastAccessedAt = guestJoined.lastAccessedAt;
  const isExpired = guestJoined.isExpired;
  // Step 3: Use refresh token to obtain new token pair
  const refreshedConnection: api.IConnection = { host: connection.host };
  const refreshedGuest: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_refresh(refreshedConnection, {
      body: {
        refresh_token,
      } satisfies ICommunityPlatformGuest.IRefresh,
    });
  typia.assert(refreshedGuest);
  // Step 4: Validate that we received a new access token
  TestValidator.notEquals(
    "new access token should differ from old",
    refreshedGuest.token.access,
    oldAccess,
  );
  // Step 5: Validate refresh token is reissued as the same string
  TestValidator.equals(
    "refresh token should be identical",
    refreshedGuest.token.refresh,
    refresh_token,
  );
  // Step 6: Validate refreshable_until is extended (new expiration)
  TestValidator.notEquals(
    "refreshable_until should be extended",
    refreshedGuest.token.refreshable_until,
    oldRefreshableUntil,
  );
  // Step 7: Validate guest identity and essential properties are preserved
  TestValidator.equals(
    "guest ID should remain unchanged",
    refreshedGuest.id,
    guestId,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    refreshedGuest.createdAt,
    createdAt,
  );
  TestValidator.predicate(
    "lastAccessed_at should be updated (newer than before)",
    new Date(refreshedGuest.lastAccessedAt) > new Date(lastAccessedAt),
  );
  TestValidator.equals(
    "isExpired flag should remain unchanged",
    refreshedGuest.isExpired,
    isExpired,
  );
  TestValidator.equals(
    "guestType should remain unchanged",
    refreshedGuest.guestType,
    guestJoined.guestType,
  );
}
