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

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Test the guest join operation confirming that a new guest session is created
  // using the minimal required anonymous identification data such as device
  // fingerprint, user agent, IP address, and anonymous ID. Validate that the
  // response contains a unique guest user ID, device fingerprint, user agent, IP
  // address, anonymous ID, creation and update timestamps, and valid JWT
  // authorization tokens (access and refresh tokens) with proper expiration times.
  // Confirm that the guest join can be called multiple times with the same data
  // to generate idempotent sessions and tokens. Verify no password or email
  // credentials are required for access.
  // Create guest data for join
  const body: IDiscussionBoardGuest.IJoin = {
    deviceFingerprint: RandomGenerator.alphaNumeric(32),
    userAgent: `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${RandomGenerator.alphabets(2)}.0.0 Safari/537.36`,
    ipAddress: `192.168.${typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}.$
      {typia.random<number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<255>>()}`,
    anonymousId: RandomGenerator.alphaNumeric(16),
  };
  // Create a new connection for guest join
  const guestConnection: api.IConnection = { host: connection.host };
  // Call utility function to authorize guest join
  const joinResult1 = await authorize_guest_join(guestConnection, { body });
  typia.assert(joinResult1);
  // Validate response properties
  TestValidator.predicate(
    "guest id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      joinResult1.id,
    ),
  );
  TestValidator.equals(
    "device fingerprint matches",
    joinResult1.deviceFingerprint,
    body.deviceFingerprint,
  );
  TestValidator.equals(
    "user agent matches",
    joinResult1.userAgent,
    body.userAgent,
  );
  TestValidator.equals(
    "ip address matches",
    joinResult1.ipAddress,
    body.ipAddress,
  );
  TestValidator.equals(
    "anonymous id matches",
    joinResult1.anonymousId,
    body.anonymousId,
  );
  // Validate timestamps format
  TestValidator.predicate(
    "createdAt is date-time",
    !isNaN(Date.parse(joinResult1.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is date-time",
    !isNaN(Date.parse(joinResult1.updatedAt)),
  );
  // deletedAt should be null
  TestValidator.equals("deletedAt is null", joinResult1.deletedAt, null);
  // Validate authorization token
  const token = joinResult1.token;
  TestValidator.predicate(
    "access token is non empty",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non empty",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is date-time",
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    !isNaN(Date.parse(token.refreshable_until)),
  );
  // Call the join again with the same data, expect the same or new valid authorization (idempotent behavior)
  const joinResult2 = await authorize_guest_join(guestConnection, { body });
  typia.assert(joinResult2);
  // Validate that the second join returns a result with same data or a new valid session (idempotency)
  TestValidator.equals(
    "device fingerprint matches",
    joinResult2.deviceFingerprint,
    body.deviceFingerprint,
  );
  TestValidator.equals(
    "user agent matches",
    joinResult2.userAgent,
    body.userAgent,
  );
  TestValidator.equals(
    "ip address matches",
    joinResult2.ipAddress,
    body.ipAddress,
  );
  TestValidator.equals(
    "anonymous id matches",
    joinResult2.anonymousId,
    body.anonymousId,
  );
  // Validate timestamps format
  TestValidator.predicate(
    "createdAt is date-time",
    !isNaN(Date.parse(joinResult2.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is date-time",
    !isNaN(Date.parse(joinResult2.updatedAt)),
  );
  // deletedAt should be null
  TestValidator.equals("deletedAt is null", joinResult2.deletedAt, null);
  // Validate authorization token
  const token2 = joinResult2.token;
  TestValidator.predicate(
    "access token is non empty",
    typeof token2.access === "string" && token2.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non empty",
    typeof token2.refresh === "string" && token2.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is date-time",
    !isNaN(Date.parse(token2.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is date-time",
    !isNaN(Date.parse(token2.refreshable_until)),
  );
  // Confirm no password or email required by type and scenario
  // (Since IDiscussionBoardGuest.IJoin contains no such properties, no further check needed)
}
