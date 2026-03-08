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

export async function test_api_guest_join_returning_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a consistent device fingerprint
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // 2. First join - create a new guest account
  const firstConnection: api.IConnection = { host: connection.host };
  const firstResponse = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(firstResponse);
  // 3. Second join - should return the existing guest account
  const secondConnection: api.IConnection = { host: connection.host };
  const secondResponse = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
    } satisfies ICommunityPlatformGuest.IJoin,
  });
  typia.assert(secondResponse);
  // 4. Validate: Same guest ID (account reuse)
  TestValidator.equals(
    "same guest ID for returning device",
    firstResponse.id,
    secondResponse.id,
  );
  // 5. Validate: Different tokens (new session created)
  TestValidator.notEquals(
    "different access tokens for each session",
    firstResponse.token.access,
    secondResponse.token.access,
  );
  TestValidator.notEquals(
    "different refresh tokens for each session",
    firstResponse.token.refresh,
    secondResponse.token.refresh,
  );
}
