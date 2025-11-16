import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

export async function test_api_admin_password_reset_token_creation_with_validation_and_purpose_rules(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser to obtain an authenticated context
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

  // 2. Build a valid password reset token creation payload for this admin account
  const now = new Date();
  const thirtyMinutesMs = 30 * 60 * 1000;
  const expiresAt = new Date(now.getTime() + thirtyMinutesMs).toISOString();

  const createBody = {
    account_type: "admin",
    account_id: adminAuthorized.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: expiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  // 3. Call the creation endpoint and validate the created token record
  const created: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // 4. Invariant checks to ensure key fields are persisted as requested
  TestValidator.equals(
    "created token account_type should match request",
    created.account_type,
    createBody.account_type,
  );

  TestValidator.equals(
    "created token account_id should match admin id",
    created.account_id,
    adminAuthorized.id,
  );

  TestValidator.equals(
    "created token purpose should match request purpose",
    created.purpose,
    createBody.purpose,
  );

  TestValidator.equals(
    "created token expires_at should match requested expires_at",
    created.expires_at,
    createBody.expires_at,
  );

  // 5. Business sanity check: expires_at must be in the future relative to now
  const createdExpiresAtTime = new Date(created.expires_at).getTime();
  const nowAfterCall = Date.now();
  TestValidator.predicate(
    "password reset token expires_at should be in the future",
    createdExpiresAtTime > nowAfterCall,
  );
}
