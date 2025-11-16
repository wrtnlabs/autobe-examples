import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPasswordResetToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPasswordResetToken";

export async function test_api_admin_password_reset_tokens_search_consumed_and_expired_filters(
  connection: api.IConnection,
) {
  // 1. Register an adminUser to obtain an authorized context
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Helper to produce ISO date-times in past/future
  const now = new Date();
  const pastDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const futureDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour later

  const adminAccountId = adminAuthorized.id;

  // 2. Create tokens: one expired, one valid, plus an extra valid for noise
  const expiredTokenBody = {
    account_type: "admin", // free-form string in base entity
    account_id: adminAccountId,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: pastDate.toISOString(),
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const validTokenBody = {
    account_type: "admin",
    account_id: adminAccountId,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "password_reset",
    expires_at: futureDate.toISOString(),
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const otherValidTokenBody = {
    account_type: "admin",
    account_id: adminAccountId,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: "account_recovery",
    expires_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
  } satisfies ICommunityPlatformPasswordResetToken.ICreate;

  const expiredToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      { body: expiredTokenBody },
    );
  typia.assert(expiredToken);

  const validToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      { body: validTokenBody },
    );
  typia.assert(validToken);

  const otherValidToken =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
      connection,
      { body: otherValidTokenBody },
    );
  typia.assert(otherValidToken);

  // 3. Search with isExpired = true, and expiresTo = now to capture only expired tokens
  const expiredSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    accountType: null,
    accountId: null,
    purpose: null,
    isConsumed: null,
    isExpired: true,
    createdFrom: null,
    createdTo: null,
    expiresFrom: null,
    expiresTo: now.toISOString(),
    consumedFrom: null,
    consumedTo: null,
    orderBy: "expires_at",
    orderDirection: "asc",
  } satisfies ICommunityPlatformPasswordResetToken.IRequest;

  const expiredPage: IPageICommunityPlatformPasswordResetToken.ISummary =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.index(
      connection,
      { body: expiredSearchBody },
    );
  typia.assert(expiredPage);

  const expiredPagination = expiredPage.pagination;
  const expiredData = expiredPage.data;

  // Pagination consistency for expired search
  TestValidator.predicate(
    "expired search pagination records >= data length",
    expiredPagination.records >= expiredData.length,
  );
  TestValidator.predicate(
    "expired search pages >= 1 when records > 0",
    expiredPagination.records === 0
      ? expiredPagination.pages === 0
      : expiredPagination.pages >= 1,
  );

  // Assert every returned token is actually expired relative to now and has status "expired"
  for (const summary of expiredData) {
    const summaryAsserted =
      typia.assert<ICommunityPlatformPasswordResetToken.ISummary>(summary);

    const summaryExpiresAt = new Date(summaryAsserted.expires_at);

    TestValidator.predicate(
      "each token in expired result has expires_at in the past",
      summaryExpiresAt.getTime() <= now.getTime(),
    );
    TestValidator.equals(
      "expired result status must be 'expired'",
      summaryAsserted.status,
      "expired",
    );
  }

  // Ensure that our known expired token is present
  const containsExpiredCreated = expiredData.some(
    (summary) => summary.id === expiredToken.id,
  );
  TestValidator.predicate(
    "explicitly created expired token should be in expired-only search",
    containsExpiredCreated,
  );

  // Ensure that valid tokens are not included in the expired-only search
  const containsValidInExpired = expiredData.some(
    (summary) => summary.id === validToken.id,
  );
  const containsOtherValidInExpired = expiredData.some(
    (summary) => summary.id === otherValidToken.id,
  );

  TestValidator.predicate(
    "valid token must not be included in expired-only search",
    !containsValidInExpired,
  );
  TestValidator.predicate(
    "other valid token must not be included in expired-only search",
    !containsOtherValidInExpired,
  );

  // 4. Search with isExpired = false and expiresFrom = now to capture only currently valid tokens
  const validSearchBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 50 as number & tags.Type<"int32">,
    accountType: null,
    accountId: null,
    purpose: null,
    isConsumed: null,
    isExpired: false,
    createdFrom: null,
    createdTo: null,
    expiresFrom: now.toISOString(),
    expiresTo: null,
    consumedFrom: null,
    consumedTo: null,
    orderBy: "expires_at",
    orderDirection: "asc",
  } satisfies ICommunityPlatformPasswordResetToken.IRequest;

  const validPage: IPageICommunityPlatformPasswordResetToken.ISummary =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.index(
      connection,
      { body: validSearchBody },
    );
  typia.assert(validPage);

  const validPagination = validPage.pagination;
  const validData = validPage.data;

  // Pagination consistency for valid search
  TestValidator.predicate(
    "valid search pagination records >= data length",
    validPagination.records >= validData.length,
  );
  TestValidator.predicate(
    "valid search pages >= 1 when records > 0",
    validPagination.records === 0
      ? validPagination.pages === 0
      : validPagination.pages >= 1,
  );

  // Every returned token should not be expired (status !== "expired") and expires_at >= now
  for (const summary of validData) {
    const summaryAsserted =
      typia.assert<ICommunityPlatformPasswordResetToken.ISummary>(summary);

    const summaryExpiresAt = new Date(summaryAsserted.expires_at);

    TestValidator.predicate(
      "each token in valid result has expires_at in the future or now",
      summaryExpiresAt.getTime() >= now.getTime(),
    );
    TestValidator.predicate(
      "valid result status should not be 'expired'",
      summaryAsserted.status !== "expired",
    );
  }

  // Ensure that our known valid token is present in the valid-only search
  const containsValidCreated = validData.some(
    (summary) => summary.id === validToken.id,
  );
  TestValidator.predicate(
    "explicitly created valid token should be in valid-only search",
    containsValidCreated,
  );

  // Ensure that expired token is not included in the valid-only search
  const containsExpiredInValid = validData.some(
    (summary) => summary.id === expiredToken.id,
  );
  TestValidator.predicate(
    "expired token must not be included in valid-only search",
    !containsExpiredInValid,
  );
}
