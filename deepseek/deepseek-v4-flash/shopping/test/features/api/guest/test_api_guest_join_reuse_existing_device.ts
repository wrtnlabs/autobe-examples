import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_reuse_existing_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest join with a unique device identifier
  const deviceIdentifier = RandomGenerator.alphaNumeric(32);
  const guestConnection1: api.IConnection = { host: connection.host };
  const guest1 = await authorize_guest_join(guestConnection1, {
    body: {
      device_identifier: deviceIdentifier,
      href: "https://example.com/auth/join",
      referrer: "https://example.com/auth/login",
    },
  });
  typia.assert(guest1);
  // 2. Second guest join with the same device identifier but different href
  const guestConnection2: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guestConnection2, {
    body: {
      device_identifier: deviceIdentifier,
      href: "https://example.com/auth/register",
      referrer: "https://example.com/auth/login",
    },
  });
  typia.assert(guest2);
  // 3. Verify same guest id is returned (existing record reused)
  TestValidator.equals("guest id reused", guest1.id, guest2.id);
  // 4. Verify a new session was created
  TestValidator.notEquals(
    "new access token",
    guest1.token.access,
    guest2.token.access,
  );
  TestValidator.notEquals(
    "new refresh token",
    guest1.token.refresh,
    guest2.token.refresh,
  );
  TestValidator.notEquals(
    "new expired_at",
    guest1.token.expired_at,
    guest2.token.expired_at,
  );
}
