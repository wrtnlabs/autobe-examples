import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_successful_registration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest join input with valid device fingerprint and session context
  const guestConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    device_fingerprint: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IRedditPlatformGuest.IJoin;
  // 2. Execute guest join operation using utility function
  const authorized = await authorize_guest_join(guestConnection, {
    body: joinInput,
  });
  typia.assert(authorized);
  // 3. Validate response structure and content
  TestValidator.equals(
    "device fingerprint matches input",
    authorized.device_fingerprint,
    joinInput.device_fingerprint,
  );
  TestValidator.predicate("guest ID is UUID format", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate("created_at is ISO datetime format", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.created_at,
    ),
  );
  // 4. Validate token structure
  TestValidator.predicate(
    "access token exists",
    () => authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    () => authorized.token.refresh.length > 0,
  );
  TestValidator.predicate("expired_at is ISO datetime format", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.expired_at,
    ),
  );
  TestValidator.predicate("refreshable_until is ISO datetime format", () =>
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      authorized.token.refreshable_until,
    ),
  );
  TestValidator.predicate(
    "expired_at is before refreshable_until",
    () => authorized.token.expired_at <= authorized.token.refreshable_until,
  );
  // 5. Verify guest connection is authorized with token
  TestValidator.predicate(
    "guest connection has authorization header",
    () => guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header matches access token",
    guestConnection.headers?.Authorization,
    authorized.token.access,
  );
}
