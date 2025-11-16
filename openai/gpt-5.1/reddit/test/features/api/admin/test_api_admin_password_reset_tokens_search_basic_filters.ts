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

/**
 * Validate admin search filters for password reset tokens.
 *
 * Business flow:
 *
 * 1. Register an adminUser (join) to obtain authorized context.
 * 2. As this admin, create multiple password reset token records with different
 *    combinations of account_type and purpose, making some that should match
 *    the search filters and others that should not.
 * 3. Invoke the search endpoint (PATCH
 *    /communityPlatform/adminUser/passwordResetTokens) with filters:
 *    accountType, purpose, isConsumed=false, plus explicit pagination (page,
 *    limit).
 * 4. Assert that:
 *
 *    - Response type matches IPageICommunityPlatformPasswordResetToken.ISummary via
 *         typia.assert.
 *    - Pagination metadata (current, limit) reflects requested values.
 *    - All returned records have matching account_type and purpose, and status
 *         "pending" (unconsumed, non-expired).
 *    - No tokens outside the specified filters (different accountType or purpose)
 *         appear in the result set.
 */
export async function test_api_admin_password_reset_tokens_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin user (join) to gain adminUser authorization
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare common values
  const adminAccountId = adminAuthorized.id;
  const targetAccountType = "adminUser";
  const otherAccountType = "memberUser";
  const targetPurpose = "password_reset";
  const otherPurpose = "email_verification";

  // base time for expires_at: future timestamps
  const now = new Date();
  const future1 = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // +1h
  const future2 = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // +2h

  // Helper to create a token
  const createToken = async (
    input: ICommunityPlatformPasswordResetToken.ICreate,
  ): Promise<ICommunityPlatformPasswordResetToken> => {
    const created =
      await api.functional.communityPlatform.adminUser.passwordResetTokens.create(
        connection,
        { body: input },
      );
    typia.assert<ICommunityPlatformPasswordResetToken>(created);
    return created;
  };

  // 2-1. Create tokens that should match the filter
  const matchingTokenBodies: ICommunityPlatformPasswordResetToken.ICreate[] = [
    {
      account_type: targetAccountType,
      account_id: adminAccountId,
      token_hash: RandomGenerator.alphaNumeric(32),
      purpose: targetPurpose,
      expires_at: future1,
    },
    {
      account_type: targetAccountType,
      account_id: adminAccountId,
      token_hash: RandomGenerator.alphaNumeric(32),
      purpose: targetPurpose,
      expires_at: future2,
    },
  ];

  for (const body of matchingTokenBodies) {
    await createToken(body);
  }

  // 2-2. Create tokens that must NOT match the filter (different account_type)
  const nonMatchingByAccountType: ICommunityPlatformPasswordResetToken.ICreate =
    {
      account_type: otherAccountType,
      account_id: typia.random<string & tags.Format<"uuid">>(),
      token_hash: RandomGenerator.alphaNumeric(32),
      purpose: targetPurpose,
      expires_at: future1,
    };
  await createToken(nonMatchingByAccountType);

  // 2-3. Create tokens that must NOT match the filter (different purpose)
  const nonMatchingByPurpose: ICommunityPlatformPasswordResetToken.ICreate = {
    account_type: targetAccountType,
    account_id: adminAccountId,
    token_hash: RandomGenerator.alphaNumeric(32),
    purpose: otherPurpose,
    expires_at: future1,
  };
  await createToken(nonMatchingByPurpose);

  // 3. Call search endpoint with filters and pagination
  const requestedPage = 1;
  const requestedLimit = 10;

  const searchRequestBody = {
    page: requestedPage,
    limit: requestedLimit,
    accountType: targetAccountType,
    accountId: adminAccountId,
    purpose: targetPurpose,
    isConsumed: false,
    isExpired: false,
  } satisfies ICommunityPlatformPasswordResetToken.IRequest;

  const pageResult: IPageICommunityPlatformPasswordResetToken.ISummary =
    await api.functional.communityPlatform.adminUser.passwordResetTokens.index(
      connection,
      { body: searchRequestBody },
    );
  typia.assert<IPageICommunityPlatformPasswordResetToken.ISummary>(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;
  const summaries: ICommunityPlatformPasswordResetToken.ISummary[] =
    pageResult.data;

  // 4-1. Verify pagination reflects requested page & limit
  TestValidator.equals(
    "pagination current page matches requested",
    pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit matches requested",
    pagination.limit,
    requestedLimit,
  );

  // There should be at least one record when filters are applied after creating
  // matching tokens, but existing data may also be present.
  TestValidator.predicate(
    "records count is positive when matching tokens exist",
    () => pagination.records > 0,
  );

  // 4-2. All returned records must satisfy our filter conditions
  for (const summary of summaries) {
    // account_type should be the filtered type
    TestValidator.equals(
      "summary account_type matches filter",
      summary.account_type,
      targetAccountType,
    );

    // account summary type should align with account_type discriminator
    if (summary.account_type === "adminUser") {
      const adminSummary =
        summary.account as ICommunityPlatformAdminuser.ISummary;
      typia.assert<ICommunityPlatformAdminuser.ISummary>(adminSummary);
    } else if (summary.account_type === "memberUser") {
      const memberSummary =
        summary.account as ICommunityPlatformMemberuser.ISummary;
      typia.assert<ICommunityPlatformMemberuser.ISummary>(memberSummary);
    }

    // Status must be "pending" for unconsumed, non-expired tokens
    TestValidator.equals(
      "token status must be pending for unconsumed, non-expired tokens",
      summary.status,
      "pending",
    );

    // requested_at and expires_at should be valid date-time strings
    typia.assert<string & tags.Format<"date-time">>(summary.requested_at);
    typia.assert<string & tags.Format<"date-time">>(summary.expires_at);
  }
}
