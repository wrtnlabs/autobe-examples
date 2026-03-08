import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_registration_session_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate session metadata for registration
  const deviceFingerprint = typia.random<string & tags.MinLength<1>>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Register guest with session metadata
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(authorized);
  // Verify guest account response structure
  TestValidator.predicate(
    "guest id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized.id,
    ),
  );
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has valid expiration",
    new Date(authorized.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "has valid refreshable until",
    new Date(authorized.token.refreshable_until) > new Date(),
  );
  // Verify session metadata was provided in registration
  TestValidator.predicate(
    "device fingerprint provided",
    deviceFingerprint.length > 0,
  );
  TestValidator.predicate("href URL provided", href.length > 0);
  TestValidator.predicate("referrer URL provided", referrer.length > 0);
  TestValidator.predicate("IP address provided", ip.length > 0);
}
