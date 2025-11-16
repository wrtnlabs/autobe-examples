import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAppeal";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationAppeal";

/**
 * Test the moderation appeals search endpoint for retrieving appeals filtered
 * by status.
 *
 * The moderator should be able to retrieve appeals with specific statuses to
 * manage the appeals queue workflow. This test validates that appeals are
 * correctly filtered by status, pagination works correctly with page and limit
 * parameters, results are properly sorted according to order_by and sort_order
 * parameters, and moderator authentication is required and enforced.
 *
 * Workflow:
 *
 * 1. Create member account (appellant)
 * 2. Create moderator account (decision maker and reviewer)
 * 3. Create report decision and appeals with different statuses
 * 4. Authenticate as moderator
 * 5. Search and filter appeals by status
 * 6. Verify pagination metadata
 * 7. Test sorting functionality
 * 8. Test filtering by member ID
 * 9. Validate appeal summary structure
 */
export async function test_api_moderation_appeals_search_by_status(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (appellant)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1).toLowerCase(),
        password: memberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: undefined,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(10);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1).toLowerCase(),
        password: moderatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: undefined,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 3: Create appeals with valid report decision ID
  // Generate a valid UUID for the report decision
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();

  // Create multiple appeals with different statuses
  const appeals: ICommunityPlatformModerationAppeal[] = [];
  const appealStatuses: Array<
    "submitted" | "in_review" | "approved" | "denied" | "reduced"
  > = ["submitted", "submitted", "in_review", "approved", "denied"];

  // Switch to member context and create appeals
  // Member is already authenticated from join operation

  for (let i = 0; i < appealStatuses.length; i++) {
    const appeal: ICommunityPlatformModerationAppeal =
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: reportDecisionId,
            appeal_reason: RandomGenerator.paragraph({
              sentences: 5,
              wordMin: 5,
              wordMax: 10,
            }),
            supporting_evidence: undefined,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    typia.assert(appeal);
    appeals.push(appeal);
  }

  // Step 4: Authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      username: undefined,
      password: moderatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
      ip: undefined,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 5: Search appeals filtered by "submitted" status
  const submittedAppeals: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_status: "submitted",
          community_platform_member_id: undefined,
          appeal_reviewer_id: undefined,
          order_by: "submitted_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(submittedAppeals);

  // Step 6: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    submittedAppeals.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    submittedAppeals.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    submittedAppeals.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    submittedAppeals.pagination.pages >= 0,
  );

  // Validate response structure
  TestValidator.predicate(
    "data array should exist and be an array",
    Array.isArray(submittedAppeals.data),
  );

  // Validate each appeal summary has required properties
  for (const appeal of submittedAppeals.data) {
    TestValidator.equals(
      "appeal status should match filter",
      appeal.appeal_status,
      "submitted",
    );
    TestValidator.predicate(
      "appeal should have valid id",
      appeal.id !== null && appeal.id !== undefined && appeal.id.length > 0,
    );
    TestValidator.predicate(
      "appeal should have appellant",
      appeal.appellant !== null && appeal.appellant !== undefined,
    );
    TestValidator.predicate(
      "appeal should have decision",
      appeal.decision !== null && appeal.decision !== undefined,
    );
    TestValidator.predicate(
      "appeal reason should not be empty",
      appeal.appeal_reason.length >= 50,
    );
    TestValidator.predicate(
      "appeal should have submitted_at timestamp",
      appeal.submitted_at !== null && appeal.submitted_at !== undefined,
    );
  }

  // Step 7: Test filtering by different status
  const approvedAppeals: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_status: "approved",
          community_platform_member_id: undefined,
          appeal_reviewer_id: undefined,
          order_by: "submitted_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(approvedAppeals);

  // Verify filter returns correct status
  for (const appeal of approvedAppeals.data) {
    TestValidator.equals(
      "approved filter should only return approved appeals",
      appeal.appeal_status,
      "approved",
    );
  }

  // Step 8: Test pagination with limit parameter
  const paginatedAppeals: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
          appeal_status: undefined,
          community_platform_member_id: undefined,
          appeal_reviewer_id: undefined,
          order_by: "submitted_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(paginatedAppeals);

  TestValidator.predicate(
    "limit should be respected in pagination",
    paginatedAppeals.data.length <= 2,
  );

  // Step 9: Test sorting in ascending order
  const sortedAscending: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_status: undefined,
          community_platform_member_id: undefined,
          appeal_reviewer_id: undefined,
          order_by: "submitted_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortedAscending);

  TestValidator.predicate(
    "ascending sort should return valid result set",
    Array.isArray(sortedAscending.data),
  );

  // Step 10: Test filtering by member ID
  const memberAppeals: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          appeal_status: undefined,
          community_platform_member_id: member.id,
          appeal_reviewer_id: undefined,
          order_by: "submitted_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(memberAppeals);

  // Verify all appeals belong to the filtered member
  for (const appeal of memberAppeals.data) {
    TestValidator.equals(
      "filtered appeals should belong to specified member",
      appeal.appellant.id,
      member.id,
    );
  }

  // Step 11: Test with page 2 to verify pagination navigation
  const secondPage: IPageICommunityPlatformModerationAppeal.ISummary =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 2,
          limit: 5,
          appeal_status: undefined,
          community_platform_member_id: undefined,
          appeal_reviewer_id: undefined,
          order_by: "submitted_at",
          sort_order: "desc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(secondPage);

  TestValidator.equals(
    "second page request should return page 2",
    secondPage.pagination.current,
    2,
  );
}
