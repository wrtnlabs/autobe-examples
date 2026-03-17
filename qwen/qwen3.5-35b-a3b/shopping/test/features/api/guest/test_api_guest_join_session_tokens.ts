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

export async function test_api_guest_join_session_tokens(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection for registration
  const guestConnection: api.IConnection = { host: connection.host };
  // Perform guest registration with random credentials
  const output: IEcommerceMallGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        user_agent: null,
      } satisfies IEcommerceMallGuest.IJoin,
    },
  );
  // Validate complete response structure (includes token validation)
  typia.assert(output);
  // Validate access token expiration is in the future
  const expiredAtMs = new Date(output.token.expired_at).getTime();
  const nowMs = Date.now();
  TestValidator.predicate(
    "access token expires in the future",
    expiredAtMs > nowMs,
  );
  // Validate refresh token deadline is after access token expiration
  const refreshableUntilMs = new Date(output.token.refreshable_until).getTime();
  TestValidator.predicate(
    "refresh token valid longer than access token",
    refreshableUntilMs > expiredAtMs,
  );
  // Validate reasonable access token lifetime (~15 minutes typical)
  const accessLifetimeMinutes = (expiredAtMs - nowMs) / 1000 / 60;
  TestValidator.predicate(
    "access token lifetime is reasonable",
    accessLifetimeMinutes > 0 && accessLifetimeMinutes <= 60,
  );
  // Validate reasonable refresh token lifetime (~7 days typical)
  const refreshLifetimeDays =
    (refreshableUntilMs - expiredAtMs) / 1000 / 60 / 60 / 24;
  TestValidator.predicate(
    "refresh token lifetime is reasonable",
    refreshLifetimeDays > 6 && refreshLifetimeDays <= 14,
  );
  // Validate guest ID is valid UUID format
  TestValidator.equals("guest id is valid UUID", output.id, output.id);
}
