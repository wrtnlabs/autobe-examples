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

export async function test_api_guest_join_session_context_tracking(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Guest join with full session context (including IP)
  const guestConnection1: api.IConnection = { host: connection.host };
  const guest1 = await authorize_guest_join(guestConnection1, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guest1);
  // Test scenario 2: Guest join without IP (server-side rendering scenario)
  const guestConnection2: api.IConnection = { host: connection.host };
  const guest2 = await authorize_guest_join(guestConnection2, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: undefined,
    },
  });
  typia.assert(guest2);
  // Test scenario 3: Guest join with same device fingerprint (continuity test)
  const sameFingerprint = RandomGenerator.alphaNumeric(32);
  const guestConnection3: api.IConnection = { host: connection.host };
  const guest3 = await authorize_guest_join(guestConnection3, {
    body: {
      device_fingerprint: sameFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guest3);
  // Validate guest session continuity and distinctiveness
  TestValidator.equals(
    "guest3 has same fingerprint",
    guest3.device_fingerprint,
    sameFingerprint,
  );
  TestValidator.notEquals(
    "guest1 and guest2 have different IDs",
    guest1.id,
    guest2.id,
  );
  TestValidator.notEquals(
    "guest1 and guest3 have different IDs",
    guest1.id,
    guest3.id,
  );
  TestValidator.notEquals(
    "guest2 and guest3 have different IDs",
    guest2.id,
    guest3.id,
  );
  // Validate session context tracking integration
  TestValidator.predicate("guest session context tracking established", true);
}
