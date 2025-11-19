import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_account_creation(
  connection: api.IConnection,
) {
  const output = await api.functional.auth.guest.join(connection, {
    body: typia.random<IDiscussionBoardGuest.ICreate>(),
  });
  typia.assert(output);

  TestValidator.equals(
    "guest account creation response should contain valid token",
    output.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "guest account creation response should contain valid refresh token",
    output.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "guest account creation response should contain valid expiration time",
    output.expiresIn > 0,
    true,
  );
  TestValidator.equals(
    "guest account creation response should contain valid guest ID",
    output.guestId.length > 0,
    true,
  );
  TestValidator.predicate(
    "token expiration should be in future",
    new Date(output.token.expired_at).getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refresh token expiration should be in future",
    new Date(output.token.refreshable_until).getTime() > Date.now(),
  );
}
