import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_returning_device(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first guest connection and join with specific device fingerprint
  const firstConnection: api.IConnection = { host: connection.host };
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const firstHref = "https://example.com/page1";
  const firstGuest = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: firstHref,
    },
  });
  typia.assert(firstGuest);
  // Step 2: Store the first guest's information
  const firstGuestId = firstGuest.id;
  const firstAccessToken = firstGuest.token.access;
  const firstRefreshToken = firstGuest.token.refresh;
  // Step 3: Create second guest connection with same device fingerprint but different href
  const secondConnection: api.IConnection = { host: connection.host };
  const secondHref = "https://example.com/page2";
  const secondGuest = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: secondHref,
    },
  });
  typia.assert(secondGuest);
  // Step 4: Validate tokens are different (new session created)
  TestValidator.notEquals(
    "access tokens differ",
    firstAccessToken,
    secondGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh tokens differ",
    firstRefreshToken,
    secondGuest.token.refresh,
  );
}
