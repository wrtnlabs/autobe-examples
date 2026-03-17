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

export async function test_api_guest_join_returning_fingerprint_identity_continuity(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique fingerprint to represent a specific device/browser
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // First connection for first guest join
  const guestConnection1: api.IConnection = { host: connection.host };
  // First call: establishes the guest record with this fingerprint
  const firstResponse = await authorize_guest_join(guestConnection1, {
    body: {
      fingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstResponse);
  // Second connection for second guest join (simulating a new page visit by same device)
  const guestConnection2: api.IConnection = { host: connection.host };
  // Second call: same fingerprint, different href and referrer
  const secondResponse = await authorize_guest_join(guestConnection2, {
    body: {
      fingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondResponse);
  // Validate: same guest identity (id must be identical)
  TestValidator.equals(
    "guest id must be identical for same fingerprint",
    firstResponse.id,
    secondResponse.id,
  );
  // Validate: fingerprint matches the provided fingerprint in both responses
  TestValidator.equals(
    "fingerprint matches provided value in first response",
    firstResponse.fingerprint,
    fingerprint,
  );
  TestValidator.equals(
    "fingerprint matches provided value in second response",
    secondResponse.fingerprint,
    fingerprint,
  );
  // Validate: created_at is identical (record not changed between calls)
  TestValidator.equals(
    "created_at must be identical across sessions",
    firstResponse.created_at,
    secondResponse.created_at,
  );
  // Validate: new session tokens are issued each time (tokens must differ)
  TestValidator.notEquals(
    "access token must be different in second session",
    firstResponse.token.access,
    secondResponse.token.access,
  );
  TestValidator.notEquals(
    "refresh token must be different in second session",
    firstResponse.token.refresh,
    secondResponse.token.refresh,
  );
  // Validate: token.expired_at in the second response is a valid future datetime
  const now = new Date();
  const expiredAt = new Date(secondResponse.token.expired_at);
  TestValidator.predicate(
    "second response token.expired_at must be in the future",
    expiredAt > now,
  );
}
