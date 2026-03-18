import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_returning_device_recognition(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint to reuse for returning visitor simulation
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // First guest session initialization with specific device fingerprint
  const guestConnection1: api.IConnection = { host: connection.host };
  const result1 = await authorize_guest_join(guestConnection1, {
    body: {
      deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmGuest.IJoin,
  });
  typia.assert(result1);
  // Second guest session initialization with the same device fingerprint (returning visitor)
  const guestConnection2: api.IConnection = { host: connection.host };
  const result2 = await authorize_guest_join(guestConnection2, {
    body: {
      deviceFingerprint, // Same fingerprint for returning device recognition
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmGuest.IJoin,
  });
  typia.assert(result2);
  // Verify returning guest has the same ID (device recognition works)
  TestValidator.equals(
    "guest id matches for returning device",
    result2.id,
    result1.id,
  );
  // Verify new tokens are generated (different from first session)
  TestValidator.notEquals(
    "access token is refreshed",
    result1.token.access,
    result2.token.access,
  );
  TestValidator.notEquals(
    "refresh token is refreshed",
    result1.token.refresh,
    result2.token.refresh,
  );
}
