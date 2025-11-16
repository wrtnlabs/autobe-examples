import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_action_creation_without_community_scope_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register a reporting member user and obtain authenticated context
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://client.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As that member user, create a non-community-scoped report
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: null,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // Validate that the report is non-community-scoped
  TestValidator.predicate(
    "report should not be bound to a specific community",
    report.context_community === null || report.context_community === undefined,
  );

  // 3. Register a community moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderatorJoinBody = {
    username: RandomGenerator.name(1),
    email: moderatorEmail,
    password: moderatorPassword,
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://client.example.com/mod/join" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/mod/landing" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 4. Explicitly switch to moderator authentication using login
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: null,
    href: "https://client.example.com/mod/tools" as string & tags.Format<"uri">,
    referrer: "https://client.example.com/mod/dashboard" as string &
      tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 5. As the moderator, create a moderation action not bound to any community
  const actionType = "warn_user";
  const targetScope = "user";

  const moderationActionCreateBody = {
    community_id: null,
    action_type: actionType,
    target_scope: targetScope,
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 6. Validate core business rules on the created moderation action
  TestValidator.equals(
    "moderation action should retain non-community scope (community_id null)",
    moderationAction.community_id ?? null,
    null,
  );

  TestValidator.equals(
    "moderation action target_scope should match requested non-community scope",
    moderationAction.target_scope,
    targetScope,
  );

  TestValidator.equals(
    "moderation action action_type should match requested value",
    moderationAction.action_type,
    actionType,
  );

  // Actor summary must be present and have a valid UUID id and non-empty displayName
  TestValidator.predicate(
    "moderation action should have an actor summary",
    moderationAction.actor !== undefined,
  );

  if (moderationAction.actor !== undefined) {
    typia.assert<ICommunityPlatformActor.ISummary>(moderationAction.actor);

    TestValidator.predicate(
      "moderation actor displayName should be non-empty",
      moderationAction.actor.displayName.length > 0,
    );
  }

  // created_at and updated_at are validated by typia.assert already; no extra checks needed.
}
