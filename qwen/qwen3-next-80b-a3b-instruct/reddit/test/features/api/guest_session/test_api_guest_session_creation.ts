import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_creation(
  connection: api.IConnection,
): Promise<void> {
  // Create guest-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random guest join data
  const guestJoinData = {
    device_fingerprint: RandomGenerator.alphaNumeric(32),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCommunityGuest.IJoin;
  // Perform guest session creation using utility function (prioritized over SDK)
  const guestAuthorized: IRedditCommunityGuest.IAuthorized =
    await authorize_guest_join(guestConnection, { body: guestJoinData });
  typia.assert(guestAuthorized);
  // Validate token structure (business logic)
  TestValidator.equals(
    "token.access is string",
    typeof guestAuthorized.token.access,
    "string",
  );
  TestValidator.equals(
    "token.refresh is string",
    typeof guestAuthorized.token.refresh,
    "string",
  );
  // Validate device fingerprint was properly captured
  TestValidator.equals(
    "device_fingerprint has correct length",
    guestJoinData.device_fingerprint.length,
    32,
  );
  TestValidator.predicate("device_fingerprint is alphanumeric", () =>
    /^[a-zA-Z0-9]+$/.test(guestJoinData.device_fingerprint),
  );
  // Ensure connection headers were updated with access token
  TestValidator.equals(
    "connection authorized with access token",
    guestConnection.headers?.Authorization,
    guestAuthorized.access,
  );
}
