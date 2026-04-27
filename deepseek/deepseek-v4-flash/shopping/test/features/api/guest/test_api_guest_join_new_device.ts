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

export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for guest operations
  const guestConnection: api.IConnection = { host: connection.host };
  // 2. Register a new guest with a unique device identifier
  const deviceIdentifier = RandomGenerator.alphaNumeric(32);
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_identifier: deviceIdentifier,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 3. Verify that a different device identifier creates a different guest
  const anotherConnection: api.IConnection = { host: connection.host };
  const anotherDeviceIdentifier = RandomGenerator.alphaNumeric(32);
  const anotherAuthorized = await authorize_guest_join(anotherConnection, {
    body: {
      device_identifier: anotherDeviceIdentifier,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(anotherAuthorized);
  TestValidator.notEquals(
    "different device yields different guest id",
    authorized.id,
    anotherAuthorized.id,
  );
}
