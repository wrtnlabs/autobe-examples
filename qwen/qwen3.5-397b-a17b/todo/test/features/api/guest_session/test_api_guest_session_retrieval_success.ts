import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoGuest";
import type { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import type { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test successful retrieval of a guest's session information after registration.
 *
 * This test validates:
 * 1. Guest account registration with device fingerprint
 * 2. Response contains valid guest ID in UUID format (validated by typia)
 * 3. Authorization token includes access and refresh tokens
 * 4. Token expiration timestamps are in ISO 8601 format
 * 5. Token refreshable_until is after expired_at
 */
export async function test_api_guest_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new guest account using device fingerprint
  const guestConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_guest_join(guestConnection, {
    body: {
      device_fingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMultiUserTodoGuest.IJoin,
  });
  // Step 2: Validate the complete response structure including UUID format
  typia.assert(joinResult);
  // Step 3: Verify access token exists and is non-empty
  TestValidator.predicate("access token exists", () => {
    return joinResult.token.access.length > 0;
  });
  // Step 4: Verify refresh token exists and is non-empty
  TestValidator.predicate("refresh token exists", () => {
    return joinResult.token.refresh.length > 0;
  });
  // Step 5: Verify expired_at is valid ISO 8601 date
  TestValidator.predicate("expired_at is valid ISO 8601 date", () => {
    const date = new Date(joinResult.token.expired_at);
    return !isNaN(date.getTime());
  });
  // Step 6: Verify refreshable_until is valid ISO 8601 date
  TestValidator.predicate("refreshable_until is valid ISO 8601 date", () => {
    const date = new Date(joinResult.token.refreshable_until);
    return !isNaN(date.getTime());
  });
  // Step 7: Verify refreshable_until is after or equal to expired_at
  TestValidator.predicate("refreshable_until is after expired_at", () => {
    const expiredAt = new Date(joinResult.token.expired_at).getTime();
    const refreshableUntil = new Date(
      joinResult.token.refreshable_until,
    ).getTime();
    return refreshableUntil >= expiredAt;
  });
}
