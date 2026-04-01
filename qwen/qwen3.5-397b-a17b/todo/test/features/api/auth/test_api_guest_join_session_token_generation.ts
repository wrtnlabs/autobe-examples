import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest registration endpoint to verify it properly generates and returns
 * complete session authentication tokens with all required fields and valid
 * expiration timestamps.
 */
export async function test_api_guest_join_session_token_generation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Prepare guest registration request with required fields
  const deviceFingerprint = RandomGenerator.alphaNumeric(32);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // 2. Register guest using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: deviceFingerprint,
      href,
      referrer,
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // 3. Validate complete response structure with typia
  typia.assert(authorized);
  // 4. Validate access token is valid JWT format (three parts separated by dots)
  const jwtParts = authorized.token.access.split(".");
  TestValidator.equals("jwt has 3 parts", jwtParts.length, 3);
  TestValidator.predicate(
    "jwt header is non-empty base64url",
    jwtParts[0].length > 0,
  );
  TestValidator.predicate(
    "jwt payload is non-empty base64url",
    jwtParts[1].length > 0,
  );
  TestValidator.predicate(
    "jwt signature is non-empty base64url",
    jwtParts[2].length > 0,
  );
  // 5. Validate expiration timestamps are reasonable
  const now = new Date();
  const expiredAt = new Date(authorized.token.expired_at);
  const refreshableUntil = new Date(authorized.token.refreshable_until);
  // expired_at should be in the future (short-term: minutes to hours)
  const expiredAtDiffMinutes =
    (expiredAt.getTime() - now.getTime()) / (1000 * 60);
  TestValidator.predicate(
    "expired_at is in future",
    expiredAt.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    `expired_at is reasonable short-term duration (${expiredAtDiffMinutes.toFixed(1)} min)`,
    expiredAtDiffMinutes > 0 && expiredAtDiffMinutes <= 1440,
  );
  // refreshable_until should be in the future (long-term: days to weeks)
  const refreshableUntilDiffDays =
    (refreshableUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  TestValidator.predicate(
    "refreshable_until is in future",
    refreshableUntil.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    `refreshable_until is reasonable long-term duration (${refreshableUntilDiffDays.toFixed(1)} days)`,
    refreshableUntilDiffDays >= 1 && refreshableUntilDiffDays <= 365,
  );
  // 6. Validate refreshable_until is after expired_at
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshableUntil.getTime() > expiredAt.getTime(),
  );
}
