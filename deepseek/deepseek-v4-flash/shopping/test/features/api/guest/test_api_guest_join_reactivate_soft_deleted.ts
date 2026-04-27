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

export async function test_api_guest_join_reactivate_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Record a specific device identifier for testing
  const deviceIdentifier: string = RandomGenerator.alphaNumeric(32);
  // 1. First join - register a guest with the device identifier
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoin = await authorize_guest_join(firstConnection, {
    body: {
      device_identifier: deviceIdentifier,
    },
  });
  typia.assert(firstJoin);
  const firstGuestId = firstJoin.id;
  // 2. Second join - same device identifier should reuse/reactivate the guest
  const secondConnection: api.IConnection = { host: connection.host };
  const secondJoin = await authorize_guest_join(secondConnection, {
    body: {
      device_identifier: deviceIdentifier,
    },
  });
  typia.assert(secondJoin);
  // 3. Verify the same guest record was reused (same id returned)
  TestValidator.equals(
    "guest id reused on second join",
    secondJoin.id,
    firstGuestId,
  );
  // 4. Verify a new session was created with fresh tokens
  TestValidator.notEquals(
    "new access token issued",
    secondJoin.token.access,
    firstJoin.token.access,
  );
  TestValidator.notEquals(
    "new refresh token issued",
    secondJoin.token.refresh,
    firstJoin.token.refresh,
  );
}
