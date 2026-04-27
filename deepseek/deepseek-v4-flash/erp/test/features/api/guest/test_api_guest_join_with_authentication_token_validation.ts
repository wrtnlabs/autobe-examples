import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_with_authentication_token_validation(
  connection: api.IConnection,
): Promise<void> {
  // Phase 1: Register a new guest user via the utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingGuest.IAuthorized =
    await authorize_guest_join(guestConnection, {});
  typia.assert(authorized);
  // --- Business logic validations on the response ---
  // Validate the response contains a member id
  TestValidator.predicate(
    "member id is assigned",
    () => authorized.id !== undefined,
  );
  // Validate device fingerprint is returned
  TestValidator.predicate(
    "device fingerprint present",
    () => authorized.device_fingerprint !== undefined,
  );
  // Validate sessions list is not null
  TestValidator.predicate("sessions is an array", () =>
    Array.isArray(authorized.sessions),
  );
  // Validate timestamps exist
  TestValidator.predicate(
    "created_at present",
    () => authorized.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at present",
    () => authorized.updated_at !== undefined,
  );
  // Validate account is active (not soft-deleted)
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Validate token exists
  TestValidator.predicate(
    "token present",
    () => authorized.token !== undefined,
  );
  // Phase 2: Validate that the SDK's join function automatically set the Authorization header
  TestValidator.predicate(
    "authorization header is set on connection",
    () => guestConnection.headers?.Authorization !== undefined,
  );
  TestValidator.equals(
    "authorization header value equals token.access",
    guestConnection.headers?.Authorization,
    authorized.token.access,
  );
  // Phase 3: Decode JWT payload and verify claims
  const tokenParts: string[] = authorized.token.access.split(".");
  TestValidator.equals(
    "JWT access token has 3 dot-separated parts",
    tokenParts.length,
    3,
  );
  // Decode the middle segment (payload) from base64url to JSON
  const base64Payload: string = tokenParts[1]
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const payload: Record<string, unknown> = JSON.parse(
    Buffer.from(base64Payload, "base64").toString("utf-8"),
  );
  // Verify member_id claim matches the registration response id
  TestValidator.equals(
    "JWT member_id claim matches response id",
    payload.member_id,
    authorized.id,
  );
  // Verify session_id claim is present in the JWT
  TestValidator.predicate(
    "JWT session_id claim exists",
    () => payload.session_id !== undefined,
  );
  // Verify exp claim (epoch seconds) matches token.expired_at (ISO 8601)
  const expiredAtEpoch: number = Math.floor(
    new Date(authorized.token.expired_at).getTime() / 1000,
  );
  TestValidator.equals(
    "JWT exp claim matches token.expired_at",
    payload.exp,
    expiredAtEpoch,
  );
}
