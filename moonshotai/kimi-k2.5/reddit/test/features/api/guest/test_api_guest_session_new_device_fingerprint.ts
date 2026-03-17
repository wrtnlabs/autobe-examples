import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_session_new_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Create new guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate unique device fingerprint and session context
  const deviceFingerprint = typia.random<string & tags.Format<"uuid">>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<(string & tags.Format<"ipv4">) | null>();
  // Create guest session using utility function
  const response = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint,
      href,
      referrer,
      ip,
    },
  });
  // Validate full response structure including tokens, timestamps, UUIDs
  typia.assert(response);
  // Validate device fingerprint from response matches the request
  TestValidator.equals(
    "device fingerprint matches request",
    response.deviceFingerprint,
    deviceFingerprint,
  );
}
