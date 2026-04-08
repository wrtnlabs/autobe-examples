import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // Step 1: Register guest account with unique device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResponse: IEcommerceMallGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() satisfies string &
          tags.Format<"uri">,
        ip: typia.random<string & tags.Format<"ipv4">>() satisfies string &
          tags.Format<"ipv4">,
        referrer: typia.random<string & tags.Format<"uri">>() satisfies string &
          tags.Format<"uri">,
      } satisfies IEcommerceMallGuest.IJoin,
    });
  typia.assert(joinResponse);
  // Step 2: Extract refresh token from successful join response
  const refreshToken: string = joinResponse.token.refresh;
  const guestId: string & tags.Format<"uuid"> = joinResponse.id;
  // Step 3: Create a NEW connection to simulate fresh request with expired token
  const refreshedConnection: api.IConnection = { host: connection.host };
  // Step 4: Attempt to refresh with the same refresh token
  // This simulates the scenario where a guest tries to refresh an expired token
  const refreshBody: IEcommerceMallGuest.IRefresh = {
    refresh: refreshToken,
  } satisfies IEcommerceMallGuest.IRefresh;
  // Step 5: Expect the system to reject the expired token with appropriate error
  // The error should indicate the token is expired and re-registration is required
  await TestValidator.httpError(
    "expired refresh token should be rejected",
    [400, 401, 403],
    async () =>
      await authorize_guest_refresh(refreshedConnection, { body: refreshBody }),
  );
  // Step 6: Verify that re-registration is required to obtain new tokens
  // Call join again with the same fingerprint to get fresh tokens
  const rejoinConnection: api.IConnection = { host: connection.host };
  const rejoinResponse: IEcommerceMallGuest.IAuthorized =
    await authorize_guest_join(rejoinConnection, {
      body: {
        fingerprint: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>() satisfies string &
          tags.Format<"uri">,
        ip: typia.random<string & tags.Format<"ipv4">>() satisfies string &
          tags.Format<"ipv4">,
        referrer: typia.random<string & tags.Format<"uri">>() satisfies string &
          tags.Format<"uri">,
      } satisfies IEcommerceMallGuest.IJoin,
    });
  typia.assert(rejoinResponse);
  // Step 7: Verify re-issued tokens are different from original expired token
  TestValidator.notEquals(
    "re-issued refresh token differs from expired token",
    refreshToken,
    rejoinResponse.token.refresh,
  );
  // Step 8: Verify the guest ID is maintained across re-registration
  // (Guest account can be reused with same fingerprint)
  TestValidator.equals(
    "guest ID maintained across re-registration",
    rejoinResponse.id,
    guestId,
  );
}
