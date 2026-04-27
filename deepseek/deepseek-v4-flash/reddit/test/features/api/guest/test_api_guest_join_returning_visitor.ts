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

export async function test_api_guest_join_returning_visitor(
  connection: api.IConnection,
): Promise<void> {
  // 1. First guest join with specific device fingerprint
  const firstConnection: api.IConnection = { host: connection.host };
  const firstResult = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: "returning-device-001",
      href: "https://example.com/popular",
      referrer: "https://google.com",
    },
  });
  typia.assert(firstResult);
  // 2. Second guest join with the SAME device_fingerprint but different href/referrer
  const secondConnection: api.IConnection = { host: connection.host };
  const secondResult = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: "returning-device-001",
      href: "https://example.com/community/science",
      referrer: "https://example.com/popular",
    },
  });
  typia.assert(secondResult);
  // 3. Verify the same guest identity is reused (same id)
  TestValidator.equals("guest id reused", secondResult.id, firstResult.id);
  // 4. Verify new tokens are issued (fresh session)
  TestValidator.notEquals(
    "access token refreshed",
    secondResult.token.access,
    firstResult.token.access,
  );
  TestValidator.notEquals(
    "refresh token refreshed",
    secondResult.token.refresh,
    firstResult.token.refresh,
  );
}
