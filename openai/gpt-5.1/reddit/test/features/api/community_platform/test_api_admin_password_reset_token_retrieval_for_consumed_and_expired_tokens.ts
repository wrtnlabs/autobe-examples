import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";

/**
 * Validate admin retrieval of password reset tokens for inspection purposes.
 *
 * Business goal: Ensure that an authenticated adminUser can create password
 * reset tokens via the administrative create endpoint and subsequently retrieve
 * individual token records via the GET inspector endpoint, regardless of their
 * lifecycle characteristics. The test focuses on verifying that the GET
 * endpoint exposes the full token record (including lifecycle fields) and that
 * it is purely id-based without applying additional filtering based on expiry
 * proximity.
 *
 * Scenario steps:
 *
 * 1. Register a new adminUser via POST /auth/adminUser/join to obtain an
 *    authorized admin context.
 * 2. Create a first password reset token with a reasonably long future expires_at
 *    using POST /communityPlatform/adminUser/passwordResetTokens.
 * 3. Immediately retrieve the first token via GET
 *    /communityPlatform/adminUser/passwordResetTokens/{passwordResetTokenId}
 *    and verify structural consistency (id, account_type, account_id,
 *    token_hash, purpose, expires_at, consumed_at, deleted_at).
 * 4. Create a second password reset token with an expires_at in the near future
 *    (short-lived window) representing a token that will soon expire.
 * 5. Retrieve the second token via the same GET endpoint and again validate that
 *    all core fields are preserved and exposed as stored.
 * 6. Cross-check that both tokens can be retrieved individually and that
 *    lifecycle-related fields are not masked, demonstrating that the endpoint
 *    serves as a read-only inspector keyed solely by token id.
 */
export async function test_api_admin_password_reset_token_retrieval_for_consumed_and_expired_tokens(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (join) to obtain an authorized admin context.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a first password reset token with a long-lived expires_at.
  const now = new Date();
  const longLivedExpiresAt = new Date(
    now.getTime() + 30 * 60 * 1000,
  ).toISOString();

  const createBody1 = {
    account_type: "admin",
    account_id: adminAuthorized.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: longLivedExpiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken1: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: createBody1,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(createdToken1);

  // 3. Retrieve the first token via GET and verify structural consistency.
  const fetchedToken1: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.at(
      connection,
      {
        passwordResetTokenId: createdToken1.id,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(fetchedToken1);

  TestValidator.equals(
    "first token: id must match between create and get",
    fetchedToken1.id,
    createdToken1.id,
  );
  TestValidator.equals(
    "first token: account_type must be preserved",
    fetchedToken1.account_type,
    createdToken1.account_type,
  );
  TestValidator.equals(
    "first token: account_id must be preserved",
    fetchedToken1.account_id,
    createdToken1.account_id,
  );
  TestValidator.equals(
    "first token: purpose must be preserved",
    fetchedToken1.purpose,
    createdToken1.purpose,
  );
  TestValidator.equals(
    "first token: token_hash must be preserved",
    fetchedToken1.token_hash,
    createdToken1.token_hash,
  );
  TestValidator.equals(
    "first token: expires_at must be preserved",
    fetchedToken1.expires_at,
    createdToken1.expires_at,
  );
  TestValidator.equals(
    "first token: consumed_at must be consistent",
    fetchedToken1.consumed_at ?? null,
    createdToken1.consumed_at ?? null,
  );
  TestValidator.equals(
    "first token: deleted_at must be consistent",
    fetchedToken1.deleted_at ?? null,
    createdToken1.deleted_at ?? null,
  );

  // 4. Create a second password reset token with a near-future expires_at.
  const nearExpiryExpiresAt = new Date(now.getTime() + 60 * 1000).toISOString();

  const createBody2 = {
    account_type: "admin",
    account_id: adminAuthorized.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: nearExpiryExpiresAt,
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken2: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: createBody2,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(createdToken2);

  // 5. Retrieve the second token and verify structural consistency.
  const fetchedToken2: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.at(
      connection,
      {
        passwordResetTokenId: createdToken2.id,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(fetchedToken2);

  TestValidator.equals(
    "second token: id must match between create and get",
    fetchedToken2.id,
    createdToken2.id,
  );
  TestValidator.equals(
    "second token: account_type must be preserved",
    fetchedToken2.account_type,
    createdToken2.account_type,
  );
  TestValidator.equals(
    "second token: account_id must be preserved",
    fetchedToken2.account_id,
    createdToken2.account_id,
  );
  TestValidator.equals(
    "second token: purpose must be preserved",
    fetchedToken2.purpose,
    createdToken2.purpose,
  );
  TestValidator.equals(
    "second token: token_hash must be preserved",
    fetchedToken2.token_hash,
    createdToken2.token_hash,
  );
  TestValidator.equals(
    "second token: expires_at must be preserved",
    fetchedToken2.expires_at,
    createdToken2.expires_at,
  );
  TestValidator.equals(
    "second token: consumed_at must be consistent",
    fetchedToken2.consumed_at ?? null,
    createdToken2.consumed_at ?? null,
  );
  TestValidator.equals(
    "second token: deleted_at must be consistent",
    fetchedToken2.deleted_at ?? null,
    createdToken2.deleted_at ?? null,
  );

  // 6. Cross-check that both tokens are independently retrievable and distinct.
  TestValidator.notEquals(
    "tokens created for the same admin should be distinct records",
    createdToken1.id,
    createdToken2.id,
  );
}
