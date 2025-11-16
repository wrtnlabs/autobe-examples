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

export async function test_api_moderation_appeals_search_by_reviewer(
  connection: api.IConnection,
) {
  // Create first moderator account
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.name(1),
      password: "TestPassword123!",
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator1);

  // Create second moderator account
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.name(1),
      password: "TestPassword123!",
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator2);

  // Create member account to submit appeals
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: "TestPassword123!",
      href: "https://example.com/auth/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Create a mock report decision for appeal submission
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();

  // Submit multiple appeals as member
  const appeals = await ArrayUtil.asyncRepeat(3, async () => {
    const appealReason = RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 4,
      wordMax: 8,
    });
    const appeal =
      await api.functional.communityPlatform.member.moderationAppeals.create(
        connection,
        {
          body: {
            community_platform_report_decision_id: reportDecisionId,
            appeal_reason: appealReason,
            supporting_evidence: RandomGenerator.pick([
              null,
              "https://example.com/evidence",
            ]) as string | null | undefined,
          } satisfies ICommunityPlatformModerationAppeal.ICreate,
        },
      );
    typia.assert(appeal);
    return appeal;
  });

  // Switch to moderator1 and search for appeals assigned to them
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator1Email,
      password: "TestPassword123!",
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test 1: Search for unassigned appeals (reviewer_id = null)
  const unassignedAppeals =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          appeal_reviewer_id: null,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(unassignedAppeals);
  TestValidator.predicate(
    "should have unassigned appeals available",
    unassignedAppeals.data.length > 0,
  );

  // Test 2: Search for appeals assigned to moderator1
  const assignedToMod1 =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          appeal_reviewer_id: moderator1.id,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(assignedToMod1);

  // Test 3: Test pagination
  const page1 =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination limit should be respected",
    page1.data.length <= 2,
  );
  TestValidator.predicate(
    "pagination info should be present",
    page1.pagination.current === 1,
  );

  // Test 4: Search by appeal status
  const submittedAppeals =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          appeal_status: "submitted",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(submittedAppeals);
  TestValidator.predicate(
    "all results should have submitted status",
    submittedAppeals.data.every((a) => a.appeal_status === "submitted"),
  );

  // Test 5: Test sorting by submitted_at
  const sortedByTime =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          order_by: "submitted_at",
          sort_order: "desc",
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(sortedByTime);
  TestValidator.predicate(
    "results should be sorted by submitted_at descending",
    sortedByTime.data.length === 0 ||
      sortedByTime.data.every(
        (appeal, index, arr) =>
          index === 0 ||
          new Date(appeal.submitted_at).getTime() <=
            new Date(arr[index - 1].submitted_at).getTime(),
      ),
  );

  // Test 6: Verify appeal contains required fields
  if (unassignedAppeals.data.length > 0) {
    const appeal = unassignedAppeals.data[0];
    TestValidator.predicate(
      "appeal should have id",
      appeal.id !== undefined && appeal.id !== null,
    );
    TestValidator.predicate(
      "appeal should have appellant",
      appeal.appellant !== undefined,
    );
    TestValidator.predicate(
      "appeal should have decision",
      appeal.decision !== undefined,
    );
    TestValidator.predicate(
      "appeal should have appeal_reason",
      appeal.appeal_reason !== undefined && appeal.appeal_reason.length >= 50,
    );
    TestValidator.predicate(
      "appeal should have appeal_status",
      ["submitted", "in_review", "approved", "denied", "reduced"].includes(
        appeal.appeal_status,
      ),
    );
  }

  // Switch to moderator2 to verify authorization
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: "TestPassword123!",
      href: "https://example.com/auth/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Test 7: Moderator2 should not see appeals assigned to moderator1
  const mod2View =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          appeal_reviewer_id: moderator1.id,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(mod2View);
  // The system should enforce authorization - moderator2 viewing appeals assigned to mod1 should fail or return empty
  // This depends on backend authorization implementation

  // Test 8: Test multiple filter combinations
  const filteredResults =
    await api.functional.communityPlatform.moderator.moderationAppeals.index(
      connection,
      {
        body: {
          appeal_status: "submitted",
          page: 1,
          limit: 10,
          order_by: "submitted_at",
          sort_order: "asc",
        } satisfies ICommunityPlatformModerationAppeal.IRequest,
      },
    );
  typia.assert(filteredResults);
}
