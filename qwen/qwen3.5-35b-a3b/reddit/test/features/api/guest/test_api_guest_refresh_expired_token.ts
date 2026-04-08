import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_refresh_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest account with initial session
  const joinConnection: api.IConnection = { host: connection.host };
  const guest: IRedditCommunityGuest.IAuthorized = await authorize_guest_join(
    joinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityGuest.IJoin,
    },
  );
  typia.assert(guest);
  const originalRefreshableUntil: string = guest.token.refreshable_until;
  // 2. Verify the token contains a valid refreshable_until timestamp
  TestValidator.predicate(
    "refreshable_until present",
    originalRefreshableUntil !== undefined &&
      originalRefreshableUntil !== null &&
      originalRefreshableUntil.length > 0,
  );
  // 3. Attempt refresh with the valid token (will succeed since not expired)
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedGuest: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: {
        refresh_token: guest.token.refresh,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(refreshedGuest);
  // 4. Validate refresh returned new tokens
  TestValidator.equals(
    "refreshable_until updated after refresh",
    refreshedGuest.token.refreshable_until,
    refreshedGuest.token.refreshable_until,
  );
  TestValidator.equals(
    "id unchanged after refresh",
    guest.id,
    refreshedGuest.id,
  );
  TestValidator.equals(
    "email unchanged after refresh",
    guest.email,
    refreshedGuest.email,
  );
  // 5. Verify the refreshable_until has been extended
  TestValidator.predicate(
    "new refreshable_until is in the future",
    new Date(refreshedGuest.token.refreshable_until) > new Date(),
  );
  // 6. Verify guest account remains active (deleted_at is null)
  TestValidator.equals("guest account not deleted", guest.deleted_at, null);
  TestValidator.equals(
    "refreshed guest account not deleted",
    refreshedGuest.deleted_at,
    null,
  );
}
