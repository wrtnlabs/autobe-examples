import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAppeal";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";

export async function test_api_member_user_appeal_creation_for_moderation_action(
  connection: api.IConnection,
) {
  // 1. Register a new member user (join) to get an authenticated member context.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. Optionally create a community under the member user context.
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: "public",
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. As the member user, create a report.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 4. Register a community moderator (separate actor).
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    ip: null,
    href: "https://community.example.com/mod/join",
    referrer: "https://community.example.com/mod/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // At this point, connection.headers.Authorization now holds moderator token.

  // 5. As the community moderator, create a moderation action.
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 4 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 6. Switch back to the member user context by logging in as the original member.
  const memberLoginBody = {
    identifier: memberJoinBody.email,
    password: memberJoinBody.password,
    ip: null,
    href: "https://community.example.com/login",
    referrer: "https://community.example.com",
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLoginAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLoginAuthorized);

  // 7. As the authenticated member user, create an appeal.
  const appealCreateBody = {
    appeal_scope: "content",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    details: RandomGenerator.paragraph({ sentences: 12 }),
  } satisfies ICommunityPlatformAppeal.ICreate;

  const appeal: ICommunityPlatformAppeal =
    await api.functional.communityPlatform.memberUser.appeals.create(
      connection,
      {
        body: appealCreateBody,
      },
    );
  typia.assert(appeal);

  // 8. Validate key fields on the created appeal.
  TestValidator.equals(
    "appeal_scope should echo request",
    appeal.appeal_scope,
    appealCreateBody.appeal_scope,
  );
  TestValidator.equals(
    "reason_summary should echo request",
    appeal.reason_summary,
    appealCreateBody.reason_summary,
  );
  TestValidator.equals(
    "details should echo request",
    appeal.details,
    appealCreateBody.details,
  );

  // Appeal status: we expect a non-empty string; if contract guarantees
  // "submitted" as initial state, assert that explicitly.
  TestValidator.predicate(
    "appeal_status should be non-empty",
    typeof appeal.appeal_status === "string" && appeal.appeal_status.length > 0,
  );

  // created_at and updated_at must be present and non-empty.
  TestValidator.predicate(
    "created_at must be a non-empty string",
    typeof appeal.created_at === "string" && appeal.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    typeof appeal.updated_at === "string" && appeal.updated_at.length > 0,
  );

  // resolved_at should be undefined at creation (no decision yet).
  TestValidator.predicate(
    "resolved_at should be undefined or null at creation",
    appeal.resolved_at === undefined || appeal.resolved_at === null,
  );

  // Optionally, if report and moderationAction are populated, ensure they
  // are structurally consistent and reference-like.
  if (appeal.report) {
    TestValidator.predicate(
      "appeal.report has a valid id",
      typeof appeal.report.id === "string" && appeal.report.id.length > 0,
    );
  }

  if (appeal.moderationAction) {
    TestValidator.predicate(
      "appeal.moderationAction has a valid id",
      typeof appeal.moderationAction.id === "string" &&
        appeal.moderationAction.id.length > 0,
    );
  }

  // 9. Negative test: unauthenticated call to create appeal should fail.
  const unauthConn: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated member user cannot create appeal",
    async () => {
      await api.functional.communityPlatform.memberUser.appeals.create(
        unauthConn,
        {
          body: appealCreateBody,
        },
      );
    },
  );
}
