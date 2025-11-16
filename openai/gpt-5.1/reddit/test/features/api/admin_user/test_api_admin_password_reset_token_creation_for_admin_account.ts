import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

export async function test_api_admin_password_reset_token_creation_for_admin_account(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser and obtain authorized context
  const joinStartedAt = new Date();

  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorizedAdmin);

  const afterJoin = new Date();

  // 2. Build a valid password reset token creation payload
  const now = new Date();
  const expiresAtFuture = new Date(
    now.getTime() + 30 * 60 * 1000,
  ).toISOString();

  const createBody = {
    account_type: "admin",
    account_id: authorizedAdmin.id,
    token_hash: RandomGenerator.alphaNumeric(64),
    purpose: "password_reset",
    expires_at: expiresAtFuture,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  // 3. Call create endpoint
  const createdToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(createdToken);

  const afterCreate = new Date();

  // 4. Business-level validations
  TestValidator.equals(
    "account_type should match request",
    createdToken.account_type,
    createBody.account_type,
  );
  TestValidator.equals(
    "account_id should match request",
    createdToken.account_id,
    createBody.account_id,
  );
  TestValidator.equals(
    "purpose should match request",
    createdToken.purpose,
    createBody.purpose,
  );
  TestValidator.equals(
    "token_hash should match request",
    createdToken.token_hash,
    createBody.token_hash,
  );
  TestValidator.equals(
    "expires_at should match request",
    createdToken.expires_at,
    createBody.expires_at,
  );

  // Lifecycle defaults: consumed_at and deleted_at should be null or undefined
  TestValidator.predicate(
    "consumed_at is null or undefined on new token",
    createdToken.consumed_at === null || createdToken.consumed_at === undefined,
  );
  TestValidator.predicate(
    "deleted_at is null or undefined on new token",
    createdToken.deleted_at === null || createdToken.deleted_at === undefined,
  );

  // created_at and updated_at must be between joinStartedAt and afterCreate
  const createdAtDate = new Date(createdToken.created_at);
  const updatedAtDate = new Date(createdToken.updated_at);

  TestValidator.predicate(
    "created_at should be between joinStartedAt and afterCreate",
    createdAtDate.getTime() >= joinStartedAt.getTime() &&
      createdAtDate.getTime() <= afterCreate.getTime(),
  );
  TestValidator.predicate(
    "updated_at should be between afterJoin and afterCreate",
    updatedAtDate.getTime() >= afterJoin.getTime() &&
      updatedAtDate.getTime() <= afterCreate.getTime(),
  );

  // 5. Negative scenario: creation must fail when expires_at is in the past
  const pastExpiresAt = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

  const invalidBody = {
    account_type: "admin",
    account_id: authorizedAdmin.id,
    token_hash: RandomGenerator.alphaNumeric(64),
    purpose: "password_reset",
    expires_at: pastExpiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  await TestValidator.error(
    "creating a token with past expires_at should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
        connection,
        {
          body: invalidBody,
        },
      );
    },
  );
}
