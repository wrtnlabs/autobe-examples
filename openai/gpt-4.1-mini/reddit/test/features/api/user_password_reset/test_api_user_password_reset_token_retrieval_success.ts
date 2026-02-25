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

export async function test_api_user_password_reset_token_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // This test will cover retrieval of a valid password reset token.
  // 1. Register a new user
  // 2. Create a password reset token for that user
  // 3. Retrieve the token by its ID and verify correctness
  // 4. Test 404 error on non-existent token ID
  // 1. Register a new user and authorize
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a password reset token for the user
  const passwordReset =
    await generate_random_community_platform_user_password_resets_create_password_reset(
      userConnection,
      { body: { email: authorized.email } },
    );
  typia.assert(passwordReset);
  // 3. Retrieve the password reset token by id
  const retrieved =
    await api.functional.communityPlatform.user.password_resets.at(
      userConnection,
      { id: passwordReset.id },
    );
  typia.assert(retrieved);
  // Ensure all fields exist and are valid
  TestValidator.equals("id matches", retrieved.id, passwordReset.id);
  TestValidator.equals(
    "communityPlatformUserId matches",
    retrieved.communityPlatformUserId,
    passwordReset.communityPlatformUserId,
  );
  TestValidator.equals("token matches", retrieved.token, passwordReset.token);
  // Token is not expired
  TestValidator.predicate(
    "token not expired",
    new Date(retrieved.expiresAt).getTime() > Date.now(),
  );
  // Token is not used
  TestValidator.equals("token not used", retrieved.used, false);
  // Validate timestamps are ISO strings
  ["createdAt", "updatedAt"].forEach((field) => {
    TestValidator.predicate(
      `${field} is ISO string`,
      typeof (retrieved as any)[field] === "string" &&
        !isNaN(new Date((retrieved as any)[field]).getTime()),
    );
  });
  // deletedAt may be null or string
  TestValidator.predicate(
    "deletedAt is null or ISO string",
    retrieved.deletedAt === null ||
      (typeof retrieved.deletedAt === "string" &&
        !isNaN(new Date(retrieved.deletedAt).getTime())),
  );
  // User summary exists and valid
  if (retrieved.user !== undefined && retrieved.user !== null) {
    typia.assert(retrieved.user);
    TestValidator.equals("user.id matches", retrieved.user.id, authorized.id);
    TestValidator.equals(
      "user.email matches",
      retrieved.user.email,
      authorized.email,
    );
    TestValidator.equals(
      "user.username matches",
      retrieved.user.username,
      authorized.username,
    );
    TestValidator.equals(
      "user.displayName matches",
      retrieved.user.displayName,
      authorized.display_name,
    );
    TestValidator.equals(
      "user.karma matches",
      retrieved.user.karma,
      authorized.karma,
    );
  }
  // 4. Test error 404 for non-existent token
  await TestValidator.httpError(
    "non-existent token returns 404",
    404,
    async () => {
      await api.functional.communityPlatform.user.password_resets.at(
        userConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
