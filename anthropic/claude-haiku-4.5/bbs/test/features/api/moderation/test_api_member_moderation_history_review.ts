import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationLog";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IPagination";

export async function test_api_member_moderation_history_review(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPassword123";
  const moderatorIp = "192.168.1.1";
  const moderatorHref = typia.random<string & tags.Format<"uri">>();
  const moderatorReferrer = typia.random<string & tags.Format<"uri">>();

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: moderatorIp,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies IDiscussionBoardModerator.IJoin,
    });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account status should be active",
    moderator.account_status,
    "active",
  );

  // 2. Create member account whose moderation history will be reviewed
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword456";

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // 3. Authenticate as moderator to establish authenticated session
  const moderatorLogin: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: moderatorIp,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(moderatorLogin);
  TestValidator.equals(
    "moderator login should return authorized status",
    moderatorLogin.account_status,
    "active",
  );

  // 4. Query member's complete moderation history
  const memberHistoryRequest: IDiscussionBoardModerationLog.IMemberHistoryRequest =
    {
      page: 1,
      limit: 20,
    } satisfies IDiscussionBoardModerationLog.IMemberHistoryRequest;

  const memberHistory: IDiscussionBoardModerationLog.IMemberModerationHistory =
    await api.functional.discussionBoard.moderator.moderation.members.index(
      connection,
      {
        memberId: member.id,
        body: memberHistoryRequest,
      },
    );
  typia.assert(memberHistory);

  // 5. Validate member profile information is present
  TestValidator.equals(
    "member profile should match created member ID",
    memberHistory.member.id,
    member.id,
  );
  TestValidator.equals(
    "member email should match registration",
    memberHistory.member.email,
    memberEmail,
  );
  TestValidator.equals(
    "member account status should be active initially",
    memberHistory.member.account_status,
    "active",
  );

  // 6. Validate violation array structure (may be empty for new member)
  TestValidator.predicate(
    "violations array should be present",
    Array.isArray(memberHistory.violations),
  );
  TestValidator.predicate(
    "violations array should not contain null values",
    !memberHistory.violations.some((v) => v === null),
  );

  // 7. Validate moderation actions array structure
  TestValidator.predicate(
    "moderation_actions array should be present",
    Array.isArray(memberHistory.moderation_actions),
  );

  // 8. Validate violation summary structure
  TestValidator.predicate(
    "violation_summary should exist",
    memberHistory.violation_summary !== null &&
      memberHistory.violation_summary !== undefined,
  );
  TestValidator.predicate(
    "total_violations count should be non-negative",
    memberHistory.violation_summary.total_violations >= 0,
  );
  TestValidator.predicate(
    "members_with_violations should be non-negative",
    memberHistory.violation_summary.members_with_violations >= 0,
  );

  // 9. Validate pagination metadata
  TestValidator.predicate(
    "pagination should be present",
    memberHistory.pagination !== null && memberHistory.pagination !== undefined,
  );
  TestValidator.equals(
    "pagination page should match request",
    memberHistory.pagination.page,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    memberHistory.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination total should be non-negative",
    memberHistory.pagination.total >= 0,
  );
  TestValidator.predicate(
    "pagination total_pages should be non-negative",
    memberHistory.pagination.total_pages >= 0,
  );

  // 10. Validate member contribution metrics
  TestValidator.predicate(
    "total_articles should be non-negative",
    memberHistory.member.total_articles >= 0,
  );
  TestValidator.predicate(
    "total_comments should be non-negative",
    memberHistory.member.total_comments >= 0,
  );

  // 11. Validate violation types if violations exist
  if (memberHistory.violations.length > 0) {
    memberHistory.violations.forEach((violation) => {
      const validViolationTypes = [
        "spam",
        "harassment",
        "inappropriate_content",
        "off_topic",
        "misinformation",
        "copyright_violation",
        "illegal_content",
      ] as const;
      TestValidator.predicate(
        "violation should have valid type",
        validViolationTypes.includes(violation.violation_type as any),
      );
      TestValidator.predicate(
        "violation_date should be ISO 8601 format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(violation.violation_date),
      );
      TestValidator.predicate(
        "created_at should be ISO 8601 format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(violation.created_at),
      );
    });
  }

  // 12. Validate enforcement action structure if actions exist
  if (memberHistory.moderation_actions.length > 0) {
    memberHistory.moderation_actions.forEach((action) => {
      TestValidator.predicate(
        "action_type should be present and non-empty",
        action.action_type !== null &&
          action.action_type !== undefined &&
          action.action_type.length > 0,
      );
      TestValidator.predicate(
        "target_type should be present and non-empty",
        action.target_type !== null &&
          action.target_type !== undefined &&
          action.target_type.length > 0,
      );
      TestValidator.predicate(
        "moderator_id should be UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          action.moderator_id,
        ),
      );
      TestValidator.predicate(
        "action created_at should be ISO 8601 format",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(action.created_at),
      );
    });
  }
}
