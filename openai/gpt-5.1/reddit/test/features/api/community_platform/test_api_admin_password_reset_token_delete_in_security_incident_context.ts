import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLoginAttempt";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformLoginAttempt";

export async function test_api_admin_password_reset_token_delete_in_security_incident_context(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser (join) to get authorized context and token
  const joinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphaNumeric(8)}@incident-admin.test`,
    password: "Admin#" + RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(adminAuthorized);

  // 2. Create a password reset token for this admin account
  const now = new Date();
  const expires = new Date(now.getTime() + 15 * 60 * 1000); // +15 minutes

  const createTokenBody = {
    account_type: "admin",
    account_id: adminAuthorized.id,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: expires.toISOString(),
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const createdToken: ICommunityPlatformPasswordResetToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      {
        body: createTokenBody,
      },
    );
  typia.assert<ICommunityPlatformPasswordResetToken>(createdToken);

  // Basic linkage validations
  TestValidator.equals(
    "created token is linked to admin account id",
    createdToken.account_id,
    adminAuthorized.id,
  );
  TestValidator.equals(
    "created token account_type is admin",
    createdToken.account_type,
    createTokenBody.account_type,
  );
  TestValidator.equals(
    "created token purpose is password_reset",
    createdToken.purpose,
    createTokenBody.purpose,
  );

  // Expires_at should be in the future relative to now
  const createdExpiresAt = new Date(createdToken.expires_at).getTime();
  TestValidator.predicate(
    "token expires_at is in the future",
    createdExpiresAt > now.getTime(),
  );

  // 3. As part of the investigation, search login attempts around this admin identifier
  const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour ahead

  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageSize = 20 as number & tags.Type<"int32"> & tags.Minimum<1>;

  const loginSearchBodyFirst = {
    identifier: adminAuthorized.email,
    page,
    page_size: pageSize,
    occurred_from: windowStart.toISOString(),
    occurred_to: windowEnd.toISOString(),
  } satisfies ICommunityPlatformLoginAttempt.IRequest;

  const firstLoginPage: IPageICommunityPlatformLoginAttempt.ISummary =
    await api.functional.communityPlatform.adminUser.loginAttempts.index(
      connection,
      {
        body: loginSearchBodyFirst,
      },
    );
  typia.assert<IPageICommunityPlatformLoginAttempt.ISummary>(firstLoginPage);

  // Validate pagination basics
  TestValidator.equals(
    "login attempts first page current equals requested page",
    firstLoginPage.pagination.current,
    loginSearchBodyFirst.page,
  );
  TestValidator.equals(
    "login attempts first page limit equals requested page_size",
    firstLoginPage.pagination.limit,
    loginSearchBodyFirst.page_size,
  );

  // If any data exists, ensure identifiers and occurred_at are sensible
  if (firstLoginPage.data.length > 0) {
    const fromMs = windowStart.getTime();
    const toMs = windowEnd.getTime();

    for (const attempt of firstLoginPage.data) {
      typia.assert<ICommunityPlatformLoginAttempt.ISummary>(attempt);

      // Identifier should be a string (and typically match the search identifier)
      TestValidator.predicate(
        "login attempt identifier is non-empty string",
        typeof attempt.identifier === "string" && attempt.identifier.length > 0,
      );

      const occurredMs = new Date(attempt.occurred_at).getTime();
      TestValidator.predicate(
        "login attempt occurred_at is within requested window",
        occurredMs >= fromMs && occurredMs <= toMs,
      );
    }
  }

  // 4. Hard delete the created password reset token
  await api.functional.communityPlatform.adminUser.passwordResetTokens.erase(
    connection,
    {
      passwordResetTokenId: createdToken.id,
    },
  );

  // 5. Re-run loginAttempts search to ensure history remains accessible
  const loginSearchBodySecond = {
    identifier: adminAuthorized.email,
    page,
    page_size: pageSize,
    occurred_from: windowStart.toISOString(),
    occurred_to: windowEnd.toISOString(),
  } satisfies ICommunityPlatformLoginAttempt.IRequest;

  const secondLoginPage: IPageICommunityPlatformLoginAttempt.ISummary =
    await api.functional.communityPlatform.adminUser.loginAttempts.index(
      connection,
      {
        body: loginSearchBodySecond,
      },
    );
  typia.assert<IPageICommunityPlatformLoginAttempt.ISummary>(secondLoginPage);

  // Validate pagination shape remains consistent after token deletion
  TestValidator.equals(
    "login attempts second page current equals requested page",
    secondLoginPage.pagination.current,
    loginSearchBodySecond.page,
  );
  TestValidator.equals(
    "login attempts second page limit equals requested page_size",
    secondLoginPage.pagination.limit,
    loginSearchBodySecond.page_size,
  );

  // Historical login attempts should still be retrievable (data may be empty, but shape is preserved)
  TestValidator.predicate(
    "login attempts data array is defined after token deletion",
    Array.isArray(secondLoginPage.data),
  );
}
