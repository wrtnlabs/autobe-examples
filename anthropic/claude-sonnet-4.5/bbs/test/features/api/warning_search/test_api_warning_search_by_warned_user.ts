import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationAction";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserWarning";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserWarning";

export async function test_api_warning_search_by_warned_user(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for issuing warnings and performing searches
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: moderatorEmail,
      password: RandomGenerator.alphaNumeric(12) + "A1!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple member accounts to receive different warnings
  const memberA = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10) + "_memberA",
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12) + "A1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberA);

  const memberB = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10) + "_memberB",
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12) + "A1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberB);

  const memberC = await api.functional.discussionBoard.members.create(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(10) + "_memberC",
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12) + "A1!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.ICreate,
    },
  );
  typia.assert(memberC);

  // Step 3: Issue multiple warnings to memberA with different severities
  const warningA1 =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberA.id,
          warning_reason: "spam",
          warning_details:
            "Posted repetitive promotional content in multiple discussions",
          severity: "minor",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warningA1);

  const warningA2 =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberA.id,
          warning_reason: "off-topic",
          warning_details:
            "Repeatedly posted unrelated content in focused economic discussions",
          severity: "moderate",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warningA2);

  const warningA3 =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberA.id,
          warning_reason: "harassment",
          warning_details:
            "Engaged in personal attacks against other community members",
          severity: "severe",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warningA3);

  // Step 4: Issue warnings to memberB with different reasons
  const warningB1 =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberB.id,
          warning_reason: "misinformation",
          warning_details:
            "Shared unverified economic data without proper sources",
          severity: "moderate",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warningB1);

  const warningB2 =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberB.id,
          warning_reason: "inappropriate language",
          warning_details: "Used offensive language in political debate thread",
          severity: "minor",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warningB2);

  // Step 5: Issue warning to memberC
  const warningC1 =
    await api.functional.discussionBoard.moderator.moderation.warnings.create(
      connection,
      {
        body: {
          discussion_board_member_id: memberC.id,
          warning_reason: "off-topic",
          warning_details:
            "Posted unrelated content in monetary policy discussion",
          severity: "minor",
        } satisfies IDiscussionBoardUserWarning.ICreate,
      },
    );
  typia.assert(warningC1);

  // Step 6: Search for warnings by memberA's ID to retrieve only their warnings
  const memberAWarnings =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_member_id: memberA.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(memberAWarnings);

  // Step 7: Validate that exactly 3 warnings are returned for memberA
  TestValidator.equals(
    "memberA should have exactly 3 warnings",
    memberAWarnings.data.length,
    3,
  );

  // Step 8: Verify all returned warnings belong to memberA
  for (const warning of memberAWarnings.data) {
    TestValidator.equals(
      "all warnings should belong to memberA",
      warning.discussion_board_member_id,
      memberA.id,
    );
  }

  // Step 9: Verify all memberA's warnings are included by checking IDs
  const returnedWarningIds = memberAWarnings.data.map((w) => w.id);
  const expectedWarningIds = [warningA1.id, warningA2.id, warningA3.id];

  for (const expectedId of expectedWarningIds) {
    TestValidator.predicate(
      "memberA warnings should include all issued warnings",
      returnedWarningIds.includes(expectedId),
    );
  }

  // Step 10: Verify warnings for other members are excluded
  for (const warning of memberAWarnings.data) {
    TestValidator.notEquals(
      "warnings for memberB should be excluded",
      warning.discussion_board_member_id,
      memberB.id,
    );
    TestValidator.notEquals(
      "warnings for memberC should be excluded",
      warning.discussion_board_member_id,
      memberC.id,
    );
  }

  // Step 11: Verify pagination works correctly
  TestValidator.equals(
    "pagination current page should be 1",
    memberAWarnings.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    memberAWarnings.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination total records should be 3",
    memberAWarnings.pagination.records,
    3,
  );
  TestValidator.equals(
    "pagination total pages should be 1",
    memberAWarnings.pagination.pages,
    1,
  );

  // Step 12: Verify acknowledgment status is null for new warnings
  for (const warning of memberAWarnings.data) {
    TestValidator.equals(
      "new warnings should have null acknowledged_at",
      warning.acknowledged_at,
      null,
    );
  }

  // Step 13: Search for memberB's warnings to verify filtering works for different members
  const memberBWarnings =
    await api.functional.discussionBoard.moderator.moderation.warnings.index(
      connection,
      {
        body: {
          discussion_board_member_id: memberB.id,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardUserWarning.IRequest,
      },
    );
  typia.assert(memberBWarnings);

  // Step 14: Validate that exactly 2 warnings are returned for memberB
  TestValidator.equals(
    "memberB should have exactly 2 warnings",
    memberBWarnings.data.length,
    2,
  );

  // Step 15: Verify all returned warnings belong to memberB
  for (const warning of memberBWarnings.data) {
    TestValidator.equals(
      "all warnings should belong to memberB",
      warning.discussion_board_member_id,
      memberB.id,
    );
  }
}
