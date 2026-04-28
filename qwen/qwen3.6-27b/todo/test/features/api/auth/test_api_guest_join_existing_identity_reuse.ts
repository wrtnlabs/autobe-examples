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

export async function test_api_guest_join_existing_identity_reuse(
  connection: api.IConnection,
) {
  const deviceFingerprint = "guest-device-returning-001";
  // 1. First Join
  const guestConnection1: api.IConnection = { host: connection.host };
  const firstResponse = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(firstResponse);
  const firstGuestId = firstResponse.id;
  // 2. Second Join
  const guestConnection2: api.IConnection = { host: connection.host };
  const secondResponse = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ITodoAppGuest.IJoin,
  });
  typia.assert(secondResponse);
  const secondGuestId = secondResponse.id;
  // 3. Verify ID Reuse
  TestValidator.equals(
    "guest ID is reused for returning visitor",
    firstGuestId,
    secondGuestId,
  );
  // 4. Verify Token Validity (Structure checked by typia.assert, content checked here)
  TestValidator.predicate(
    "first response contains valid access token",
    firstResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "second response contains valid access token",
    secondResponse.token.access.length > 0,
  );
  // 5. Verify Session Expiration (checked by typia.assert for date-time format)
}
