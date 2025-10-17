import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";

export async function test_api_user_registration(connection: api.IConnection) {
  const randomPassword = RandomGenerator.alphaNumeric(12);
  const randomUsername = RandomGenerator.alphabets(8);
  const registrationResponse = await api.functional.auth.user.join(connection, {
    body: {
      password_hash: randomPassword,
      username: randomUsername,
    } satisfies IUser.ICreate,
  });
  typia.assert(registrationResponse);
  TestValidator.equals(
    "registration response should contain valid token",
    registrationResponse.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "token should have valid expiration",
    registrationResponse.token.expired_at > new Date().toISOString(),
    true,
  );
  TestValidator.equals(
    "refresh token should be valid until",
    registrationResponse.token.refreshable_until > new Date().toISOString(),
    true,
  );
}
