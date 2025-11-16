import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

export async function test_api_admin_password_reset_token_hard_delete_after_creation(
  connection: api.IConnection,
) {
  // 1. Join as a new adminUser to obtain authorized context
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a password reset token for this admin account
  const expiresAt: string & tags.Format<"date-time"> = new Date(
    Date.now() + 1000 * 60 * 60,
  ).toISOString() as string & tags.Format<"date-time">;

  const createBody = {
    account_type: "admin",
    account_id: adminAuthorized.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: expiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdToken);

  // Basic business sanity checks on created token
  TestValidator.equals(
    "created token should target the joined admin account",
    createdToken.account_id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "created token account_type should be 'admin'",
    createdToken.account_type,
    "admin",
  );
  TestValidator.equals(
    "created token purpose should be 'password_reset'",
    createdToken.purpose,
    "password_reset",
  );

  // 3. Hard delete the password reset token by its UUID
  await api.functional.communityPlatform.adminUser.passwordResetTokens.erase(
    connection,
    { passwordResetTokenId: createdToken.id },
  );

  // If erase throws, the test will fail. Successful completion implies
  // that the adminUser could hard delete the token as expected.
}
