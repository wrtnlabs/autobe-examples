import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformModerationCaseMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseMetadata";
import type { ICommunityPlatformModerationCaseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCaseReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationCaseReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationCaseReport";

/**
 * Verify that moderation case report listing enforces adminUser-only
 * authorization.
 *
 * Business goal:
 *
 * - Ensure that the reports listing endpoint for a moderation case cannot be
 *   accessed without a valid adminUser authentication context, and that a
 *   properly authenticated adminUser can successfully retrieve the paginated
 *   report summaries.
 *
 * High-level steps:
 *
 * 1. Create and authenticate an adminUser via /auth/adminUser/join.
 * 2. Using that adminUser context, create a moderation case via
 *    /communityPlatform/adminUser/moderationCases and capture its case_key.
 * 3. Build a minimal, valid ICommunityPlatformModerationCaseReport.IRequest body
 *    to be reused for listing reports (e.g., page/limit only).
 * 4. Construct an unauthenticated connection and attempt to call
 *    moderationCases.reports.index; assert that it fails with an error.
 * 5. Call moderationCases.reports.index again using the authenticated connection
 *    and assert that it succeeds and returns a correctly typed
 *    IPageICommunityPlatformModerationCaseReport.ISummary.
 */
export async function test_api_moderation_case_reports_authorization_enforced(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an adminUser via join.
  const joinBody = typia.random<ICommunityPlatformAdminUserJoin.IRequest>();

  const adminAuthorized: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a moderation case tied to this adminUser context.
  const moderationCreateBody =
    typia.random<ICommunityPlatformModerationCase.ICreate>();

  const moderationCase: ICommunityPlatformModerationCase =
    await api.functional.communityPlatform.adminUser.moderationCases.create(
      connection,
      {
        body: moderationCreateBody,
      },
    );
  typia.assert(moderationCase);

  // 3. Prepare a minimal valid request body for reports listing.
  const pageValue = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;
  const limitValue = typia.random<
    number & tags.Type<"int32">
  >() satisfies number as number;

  const reportsRequestBody = {
    page: pageValue,
    limit: limitValue,
  } satisfies ICommunityPlatformModerationCaseReport.IRequest;

  // 4. Attempt with an unauthenticated connection: expect an error.
  const unauthenticated: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated access to moderation case reports should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.moderationCases.reports.index(
        unauthenticated,
        {
          caseKey: moderationCase.case_key,
          body: reportsRequestBody,
        },
      );
    },
  );

  // 5. Call with authenticated connection: expect success and valid page payload.
  const pageResult: IPageICommunityPlatformModerationCaseReport.ISummary =
    await api.functional.communityPlatform.adminUser.moderationCases.reports.index(
      connection,
      {
        caseKey: moderationCase.case_key,
        body: reportsRequestBody,
      },
    );
  typia.assert(pageResult);

  // Basic business sanity checks on pagination.
  TestValidator.predicate(
    "pagination current page should equal requested page",
    pageResult.pagination.current === reportsRequestBody.page,
  );

  TestValidator.predicate(
    "pagination limit should match requested limit",
    pageResult.pagination.limit === reportsRequestBody.limit,
  );
}
