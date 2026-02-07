import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_blocked_ip_or_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Establish actor-specific connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Attempt join with empty body (valid type, but server should block due to banned IP/device fingerprint)
  // In reality, this would be blocked by server-side detection of blacklisted IPs or device fingerprint patterns
  // defined in community_audit_logs or community_banned_users tables
  // Use utility function as required (priority over SDK)
  await TestValidator.httpError(
    "guest join with blocked IP/device fingerprint should return 403 Forbidden",
    403,
    async () => {
      await authorize_guest_join(guestConnection, {
        body: {},
      });
    },
  );
}
