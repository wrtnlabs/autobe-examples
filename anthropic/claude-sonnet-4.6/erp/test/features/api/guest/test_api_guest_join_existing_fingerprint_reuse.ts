import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_existing_fingerprint_reuse(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique fingerprint for this test run
  const fingerprint = RandomGenerator.alphaNumeric(32);
  // First visit: create a new guest connection and join
  const firstConnection: api.IConnection = { host: connection.host };
  const firstResponse = await authorize_guest_join(firstConnection, {
    body: {
      fingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstResponse);
  // Record identity from first visit
  const firstId = firstResponse.id;
  const firstCreatedAt = firstResponse.created_at;
  const firstFingerprint = firstResponse.fingerprint;
  // Second visit: create a separate guest connection and join with the SAME fingerprint
  const secondConnection: api.IConnection = { host: connection.host };
  const secondResponse = await authorize_guest_join(secondConnection, {
    body: {
      fingerprint,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondResponse);
  // Validate: same guest record is reused (id and created_at must match)
  TestValidator.equals(
    "guest id is reused on second visit",
    secondResponse.id,
    firstId,
  );
  TestValidator.equals(
    "created_at is unchanged on second visit",
    secondResponse.created_at,
    firstCreatedAt,
  );
  // Validate: fingerprint matches the submitted fingerprint in both responses
  TestValidator.equals(
    "first response fingerprint matches submitted",
    firstFingerprint,
    fingerprint,
  );
  TestValidator.equals(
    "second response fingerprint matches submitted",
    secondResponse.fingerprint,
    fingerprint,
  );
  // Validate: fresh tokens exist (non-empty strings)
  TestValidator.predicate(
    "second access token is non-empty",
    secondResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "second refresh token is non-empty",
    secondResponse.token.refresh.length > 0,
  );
  // Validate: expired_at and refreshable_until are future timestamps
  const now = new Date().toISOString();
  TestValidator.predicate(
    "expired_at is in the future",
    secondResponse.token.expired_at > now,
  );
  TestValidator.predicate(
    "refreshable_until is in the future",
    secondResponse.token.refreshable_until > now,
  );
}
