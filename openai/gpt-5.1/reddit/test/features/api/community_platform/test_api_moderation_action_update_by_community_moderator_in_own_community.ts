import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Verify that a community moderator can update a moderation action in a
 * community they moderate.
 *
 * Business flow covered by this test:
 *
 * 1. Register a platform admin, a member user, and a community moderator via auth
 *    APIs.
 * 2. As platform admin, create a community visibility level so communities can
 *    reference it.
 * 3. As member user, create a community using that visibility level.
 * 4. As member user, create a report scoped to that community.
 * 5. As community moderator, create a moderation action referencing the community
 *    (and logically the report).
 * 6. As the same community moderator, update the moderation action via PUT
 *    /communityPlatform/communityModerator/moderationActions/{moderationActionId}.
 * 7. Validate that mutable fields are updated while identifiers and creation
 *    metadata remain stable.
 */
export async function test_api_moderation_action_update_by_community_moderator_in_own_community(
  connection: api.IConnection,
) {
  // 1. Register actors: platform admin, member user, community moderator
  const baseHref: string = "https://example.com/join";
  const baseReferrer: string = "https://example.com/landing";

  // 1-1. Platform admin join (also authenticates and sets Authorization)
  const platformAdminEmail: string =
    "platform-admin-" + RandomGenerator.alphaNumeric(8) + "@example.com";
  const platformAdminUsername: string =
    "platform-admin-" + RandomGenerator.alphaNumeric(8);
  const platformAdminPassword: string = "P@ssw0rd!";
  const platformAdminJoinBody = {
    username: platformAdminUsername,
    email: platformAdminEmail as string & tags.Format<"email">,
    password: platformAdminPassword,
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 1-2. Member user join
  const memberEmail: string =
    "member-" + RandomGenerator.alphaNumeric(8) + "@example.com";
  const memberUsername: string = "member-" + RandomGenerator.alphaNumeric(8);
  const memberPassword: string = "P@ssw0rd!";
  const memberJoinBody = {
    username: memberUsername,
    email: memberEmail as string & tags.Format<"email">,
    password: memberPassword,
    ip: "127.0.0.1",
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 1-3. Community moderator join
  const moderatorEmail: string =
    "moderator-" + RandomGenerator.alphaNumeric(8) + "@example.com";
  const moderatorUsername: string =
    "moderator-" + RandomGenerator.alphaNumeric(8);
  const moderatorPassword: string = "P@ssw0rd!";
  const moderatorJoinBody = {
    username: moderatorUsername,
    email: moderatorEmail as string & tags.Format<"email">,
    password: moderatorPassword,
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. Switch to platformAdmin explicitly via login to ensure header context
  const platformAdminLoginBody = {
    identifier: platformAdminEmail,
    password: platformAdminPassword,
    ip: "127.0.0.1",
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;

  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: platformAdminLoginBody,
    });
  typia.assert(platformAdminLogin);

  // 3. Create a community visibility level as platformAdmin
  const visibilityCode: string =
    "public-e2e-" + RandomGenerator.alphaNumeric(6);
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public E2E Visibility",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to memberUser via login
  const memberLoginBody = {
    identifier: memberEmail,
    password: memberPassword,
    ip: "127.0.0.1",
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformMemberuser.ILoginRequest;

  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberLoginBody,
    });
  typia.assert(memberLogin);

  // 5. Create a community as memberUser
  const communityIdentifier: string =
    "community-e2e-" + RandomGenerator.alphaNumeric(6);
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: "E2E Test Community",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityCode,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Create a report for that community as memberUser
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 7. Switch to communityModerator via login
  const moderatorLoginBody = {
    identifier: moderatorEmail,
    password: moderatorPassword,
    ip: "127.0.0.1",
    href: baseHref as string & tags.Format<"uri">,
    referrer: baseReferrer as string & tags.Format<"uri">,
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorLoginBody,
    });
  typia.assert(moderatorLoginAuthorized);

  // 8. Create a moderation action in that community as communityModerator
  const moderationCreateBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
    notes_internal: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 3,
      sentenceMax: 6,
    }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      { body: moderationCreateBody },
    );
  typia.assert(createdAction);

  const originalId = createdAction.id;
  const originalReportId = createdAction.community_platform_report_id;
  const originalCommunityId = createdAction.community_id ?? null;
  const originalCreatedAt = createdAction.created_at;
  const originalUpdatedAt = createdAction.updated_at;
  const originalActorId = createdAction.actor?.id ?? null;

  // 9. Update the moderation action as the same moderator
  const updatedReasonSummary = RandomGenerator.paragraph({ sentences: 3 });
  const updatedNotesInternal = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 5,
    sentenceMax: 8,
    wordMin: 3,
    wordMax: 8,
  });

  const updateBody = {
    reason_summary: updatedReasonSummary,
    notes_internal: updatedNotesInternal,
  } satisfies ICommunityPlatformModerationAction.IUpdate;

  const updatedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.update(
      connection,
      {
        moderationActionId: createdAction.id,
        body: updateBody,
      },
    );
  typia.assert(updatedAction);

  // 10. Validate business expectations
  TestValidator.equals(
    "updated moderation action id should remain unchanged",
    updatedAction.id,
    originalId,
  );

  TestValidator.equals(
    "updated moderation action report id should remain unchanged",
    updatedAction.community_platform_report_id,
    originalReportId,
  );

  TestValidator.equals(
    "updated moderation action community id should remain unchanged",
    updatedAction.community_id ?? null,
    originalCommunityId,
  );

  TestValidator.equals(
    "updated moderation action reason_summary should be updated",
    updatedAction.reason_summary ?? null,
    updatedReasonSummary,
  );

  TestValidator.equals(
    "updated moderation action notes_internal should be updated",
    updatedAction.notes_internal ?? null,
    updatedNotesInternal,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedAction.created_at,
    originalCreatedAt,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string (updated or at least set)",
    typeof updatedAction.updated_at === "string" &&
      updatedAction.updated_at.length > 0,
  );

  if (originalActorId !== null && updatedAction.actor !== undefined) {
    TestValidator.equals(
      "actor id should remain consistent across updates",
      updatedAction.actor.id,
      originalActorId,
    );
  }
}
