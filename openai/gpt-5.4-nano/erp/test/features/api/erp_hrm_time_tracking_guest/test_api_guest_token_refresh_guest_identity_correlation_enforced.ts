import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_token_refresh_guest_identity_correlation_enforced(
  connection: api.IConnection,
): Promise<void> {
  const makeGuestCredentials = async () => {
    const email =
      `${RandomGenerator.alphabets(10)}@example.com` satisfies string;
    const password = `pw-${RandomGenerator.alphabets(16)}` satisfies string;
    const body = {
      email,
      password,
    } satisfies IErpHrmTimeTrackingGuest.IJoin;
    return body;
  };
  // Scenario 1: Guest refresh renews tokens and preserves identity
  {
    const guestAConnection: api.IConnection = { host: connection.host };
    const guestAJoinBody = await makeGuestCredentials();
    const guestAAuthorized = await authorize_guest_join(guestAConnection, {
      body: guestAJoinBody,
    });
    typia.assert(guestAAuthorized);
    const guestIdA = guestAAuthorized.id;
    const refreshTokenA = guestAAuthorized.token.refresh;
    const refreshConnection: api.IConnection = { host: connection.host };
    const refreshSnapshot = new Date().toISOString();
    const refreshedA = await authorize_guest_refresh(refreshConnection, {
      body: {
        refreshToken: refreshTokenA,
      } satisfies IErpHrmTimeTrackingGuest.IRefresh,
    });
    typia.assert(refreshedA);
    TestValidator.equals("guest id preserved", refreshedA.id, guestIdA);
    TestValidator.predicate(
      "expired_at later than refresh snapshot",
      refreshedA.token.expired_at > refreshSnapshot,
    );
    TestValidator.predicate(
      "refreshable_until >= expired_at",
      refreshedA.token.refreshable_until >= refreshedA.token.expired_at,
    );
  }
  // Scenario 2: mismatched guest correlation is rejected
  {
    const guestAConnection: api.IConnection = { host: connection.host };
    const guestBConnection: api.IConnection = { host: connection.host };
    const guestAJoinBody = await makeGuestCredentials();
    const guestAAuthorized = await authorize_guest_join(guestAConnection, {
      body: guestAJoinBody,
    });
    typia.assert(guestAAuthorized);
    const guestBJoinBody = await makeGuestCredentials();
    const guestBAuthorized = await authorize_guest_join(guestBConnection, {
      body: guestBJoinBody,
    });
    typia.assert(guestBAuthorized);
    await TestValidator.httpError(
      "refresh rejects mismatched guest correlation",
      403,
      async () => {
        await authorize_guest_refresh(guestBConnection, {
          body: {
            refreshToken: guestAAuthorized.token.refresh,
          } satisfies IErpHrmTimeTrackingGuest.IRefresh,
        });
      },
    );
  }
}
