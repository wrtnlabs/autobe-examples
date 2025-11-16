import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

export async function test_api_admin_password_reset_token_retrieval_by_id(
  connection: api.IConnection,
) {
  // 1. Admin joins to obtain an authenticated adminUser context
  const joinInput = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinInput,
    });
  typia.assert(admin);

  // 2. Create a new password reset token for this admin account
  const futureExpiresAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60 * 24,
  ).toISOString();

  const createBody = {
    account_type: "admin",
    account_id: admin.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: futureExpiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdToken);

  // Basic invariants on the created token
  TestValidator.equals(
    "created token account_type should match request",
    createdToken.account_type,
    createBody.account_type,
  );
  TestValidator.equals(
    "created token account_id should match request",
    createdToken.account_id,
    createBody.account_id,
  );
  TestValidator.equals(
    "created token purpose should match request",
    createdToken.purpose,
    createBody.purpose,
  );
  TestValidator.equals(
    "created token token_hash should match request",
    createdToken.token_hash,
    createBody.token_hash,
  );
  TestValidator.equals(
    "created token expires_at should match request",
    createdToken.expires_at,
    createBody.expires_at,
  );

  // For a freshly created token, consumed_at and deleted_at should be null or undefined
  TestValidator.predicate(
    "created token consumed_at should be null or undefined",
    createdToken.consumed_at === null || createdToken.consumed_at === undefined,
  );
  TestValidator.predicate(
    "created token deleted_at should be null or undefined",
    createdToken.deleted_at === null || createdToken.deleted_at === undefined,
  );

  // created_at and updated_at should be set (typia.assert already ensures format)
  TestValidator.predicate(
    "created token created_at should be non-empty string",
    typeof createdToken.created_at === "string" &&
      createdToken.created_at.length > 0,
  );
  TestValidator.predicate(
    "created token updated_at should be non-empty string",
    typeof createdToken.updated_at === "string" &&
      createdToken.updated_at.length > 0,
  );

  // 3. Retrieve the token by its ID
  const retrievedToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.at(
      connection,
      {
        passwordResetTokenId: createdToken.id,
      },
    );
  typia.assert(retrievedToken);

  // 4. Verify that the retrieved token matches the created token on key fields
  TestValidator.equals(
    "retrieved token id should match created token id",
    retrievedToken.id,
    createdToken.id,
  );
  TestValidator.equals(
    "retrieved token account_type should match created token",
    retrievedToken.account_type,
    createdToken.account_type,
  );
  TestValidator.equals(
    "retrieved token account_id should match created token",
    retrievedToken.account_id,
    createdToken.account_id,
  );
  TestValidator.equals(
    "retrieved token purpose should match created token",
    retrievedToken.purpose,
    createdToken.purpose,
  );
  TestValidator.equals(
    "retrieved token token_hash should match created token",
    retrievedToken.token_hash,
    createdToken.token_hash,
  );
  TestValidator.equals(
    "retrieved token expires_at should match created token",
    retrievedToken.expires_at,
    createdToken.expires_at,
  );

  // Lifecycle fields consistency between created and retrieved tokens
  TestValidator.equals(
    "retrieved token created_at should match created token",
    retrievedToken.created_at,
    createdToken.created_at,
  );
  TestValidator.equals(
    "retrieved token updated_at should match created token",
    retrievedToken.updated_at,
    createdToken.updated_at,
  );
  TestValidator.equals(
    "retrieved token consumed_at should match created token",
    retrievedToken.consumed_at ?? null,
    createdToken.consumed_at ?? null,
  );
  TestValidator.equals(
    "retrieved token deleted_at should match created token",
    retrievedToken.deleted_at ?? null,
    createdToken.deleted_at ?? null,
  );

  // Final full-object equality check to ensure no hidden divergences
  TestValidator.equals(
    "retrieved token should deeply equal created token",
    retrievedToken,
    createdToken,
  );
}
