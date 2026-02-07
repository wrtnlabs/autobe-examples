import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_refresh_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest setup - create a new temporary guest session
  const guestConnection: api.IConnection = { host: connection.host };
  const initialGuest: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: typia.random<ICommunityPlatformGuest.IJoin>(),
    });
  typia.assert(initialGuest);
  // 2. Refresh guest session
  const refreshConnection: api.IConnection = { host: connection.host };
  const refreshedGuest: ICommunityPlatformGuest.IAuthorized =
    await authorize_guest_refresh(refreshConnection, {
      body: typia.random<ICommunityPlatformGuest.IRefresh>(),
    });
  typia.assert(refreshedGuest);
  // 3. Verify tokens were refreshed with 30-minute extension
  const initialExpiry = new Date(initialGuest.token.refreshable_until);
  const refreshedExpiry = new Date(refreshedGuest.token.refreshable_until);
  const timeDifference = refreshedExpiry.getTime() - initialExpiry.getTime();
  const minutesDifference = timeDifference / (60 * 1000); // Convert milliseconds to minutes
  TestValidator.predicate(
    "Tokens were refreshed with 30-minute extension",
    minutesDifference >= 29 && minutesDifference <= 31,
  );
}
