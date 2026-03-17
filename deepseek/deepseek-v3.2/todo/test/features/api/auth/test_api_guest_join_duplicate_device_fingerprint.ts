import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_duplicate_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Prepare test data with proper tagged types
  const deviceFingerprint = typia.random<string>();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // First guest join - use utility function
  const firstConnection: api.IConnection = { host: connection.host };
  const firstGuest = await authorize_guest_join(firstConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    },
  });
  typia.assert(firstGuest);
  // Second guest join with same fingerprint - create new connection
  const secondConnection: api.IConnection = { host: connection.host };
  const secondGuest = await authorize_guest_join(secondConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: href,
      referrer: referrer,
      ip: ip,
    },
  });
  typia.assert(secondGuest);
  // Analyze duplicate handling behavior
  // Option 1: New account created anyway
  if (firstGuest.id !== secondGuest.id) {
    // Option 2: Same account returned with refreshed tokens
    TestValidator.equals(
      "same guest",
      firstGuest.device_fingerprint,
      secondGuest.device_fingerprint,
    );
    // Token refresh validation
    TestValidator.notEquals(
      "refreshed tokens should have different access",
      firstGuest.token.access,
      secondGuest.token.access,
    );
    TestValidator.notEquals(
      "refreshed tokens should have different",
      firstGuest.token.refresh,
      secondGuest.token.refresh,
    );
    // Timestamp validation
    TestValidator.predicate(
      "updated_at should be more recent for refreshed",
      new Date(secondGuest.updated_at) > new Date(firstGuest.updated_at),
    );
    return; // Test complete for same account refresh
    // Option 3: Error response would be caught by authorize_guest_join
    // If we reach here, something unexpected duplicate device fingerprint handling
    throw new Error(
      "Unexpected duplicate device fingerprint handling behavior",
    );
  }
}
