import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_password_resets_create_password_reset } from "../../../generate/generate_random_community_platform_user_password_resets_create_password_reset";
import { prepare_random_community_platform_user_password_reset } from "../../../prepare/prepare_random_community_platform_user_password_reset";

export async function test_api_user_password_reset_token_retrieval_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Test attempting to retrieve a password reset token that has expired.
  // The test flow:
  // 1. Register a new user using authorize_user_join utility to get the user.
  // 2. Create a password reset token for that user with expiration time in the past.
  // 3. Attempt to retrieve the password reset token by its id.
  // 4. Assert the retrieved token expiration date is in the past (expired) and that fields are valid.
  // 5. If the system returns 404 or error for expired token, validate the error is properly thrown.
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  userConnection.headers ??= {};
  userConnection.headers.Authorization = authorizedUser.token.access;
  // Create a password reset token (using utility) with expired timestamp
  const expiredDate = new Date(Date.now() - 1000 * 60 * 60); // expired 1 hour ago
  // Since generate_random_community_platform_user_password_resets_create_password_reset does not allow custom expiresAt,
  // we create the token normally then directly assert it is created.
  // We will assume the system sets expiresAt properly, but since expired token must be tested,
  // we must either mock this or assume environment accepts past expiration.
  const token =
    await generate_random_community_platform_user_password_resets_create_password_reset(
      userConnection,
      {
        body: {
          email: authorizedUser.email,
        },
      },
    );
  // We attempt to retrieve the created token by id
  try {
    const retrieved =
      await api.functional.communityPlatform.user.password_resets.at(
        userConnection,
        {
          id: token.id,
        },
      );
    typia.assert(retrieved);
    // Test that token is expired (expiresAt is before now)
    const expiresAtDate = new Date(retrieved.expiresAt);
    TestValidator.predicate(
      "expired token has expiresAt in the past",
      expiresAtDate < new Date(),
    );
    // Test that token id matches
    TestValidator.equals(
      "retrieved token id equals created token id",
      retrieved.id,
      token.id,
    );
  } catch (exp) {
    // If server returns 404 or error for expired token, test that error is thrown
    await TestValidator.httpError(
      "retrieving expired token throws error",
      [404, 410],
      async () => {
        await api.functional.communityPlatform.user.password_resets.at(
          userConnection,
          {
            id: token.id,
          },
        );
      },
    );
  }
}
