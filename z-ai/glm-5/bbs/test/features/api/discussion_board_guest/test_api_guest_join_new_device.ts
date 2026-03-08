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

export async function test_api_guest_join_new_device(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique device fingerprint for this guest
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // Create a new connection for guest actor (connection isolation pattern)
  const guestConnection: api.IConnection = { host: connection.host };
  // Join as a new guest with unique device fingerprint
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Validate complete response structure (id, token with all fields)
  typia.assert(authorized);
  // Verify connection is now authenticated with access token
  TestValidator.predicate(
    "guest connection has authorization header",
    guestConnection.headers?.Authorization !== undefined,
  );
}
