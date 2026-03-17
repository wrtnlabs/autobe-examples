import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_returning_device_fingerprint(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique device fingerprint for this test
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  // First join - create initial guest account
  const firstJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(firstJoin);
  // Second join - same device fingerprint should reuse existing account
  const secondJoin = await authorize_guest_join(connection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneGuest.IJoin,
  });
  typia.assert(secondJoin);
  // Validate: Same guest account is reused (ID must match)
  TestValidator.equals(
    "same guest ID for returning device",
    firstJoin.id,
    secondJoin.id,
  );
  // Validate: New session tokens are issued (access tokens should differ)
  TestValidator.notEquals(
    "new session tokens issued",
    firstJoin.token.access,
    secondJoin.token.access,
  );
  TestValidator.notEquals(
    "new refresh tokens issued",
    firstJoin.token.refresh,
    secondJoin.token.refresh,
  );
}
