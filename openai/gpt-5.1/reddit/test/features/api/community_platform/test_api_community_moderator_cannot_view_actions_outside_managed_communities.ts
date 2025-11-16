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
 * Verify that a community moderator cannot view moderation actions belonging to
 * communities they do not moderate.
 *
 * Business context:
 *
 * - Moderation actions are sensitive enforcement records tied to reports and
 *   (optionally) communities.
 * - Community moderators must only see actions within communities they manage;
 *   cross-community access should be forbidden.
 *
 * Steps:
 *
 * 1. Register a platformAdmin and create a visibility level that communities can
 *    use.
 * 2. Register a memberUser and create two communities using that visibility level.
 * 3. As the memberUser, create a report scoped to the first community.
 * 4. Register two community moderators: moderatorA and moderatorB.
 * 5. As moderatorA, create a moderation action for the report in community1 and
 *    capture its id.
 * 6. As moderatorA, confirm that the moderation action can be retrieved
 *    successfully via GET
 *    /communityPlatform/communityModerator/moderationActions/{id}.
 * 7. Switch authentication to moderatorB via login.
 * 8. As moderatorB, attempt to retrieve the same moderation action id; assert that
 *    the API call fails (authorization error) using TestValidator.error.
 *
 * This ensures that community moderators cannot inspect moderation actions
 * outside their managed communities.
 */
export async function test_api_community_moderator_cannot_view_actions_outside_managed_communities(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to be able to create visibility levels.
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level as platformAdmin.
  const visibilityCreateBody = {
    code: `public-${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Member user joins and becomes the actor for community and report creation.
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: "127.0.0.1",
    href: "https://community.example.com/signup",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As memberUser, create two communities using the created visibility level code.
  const community1CreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community1: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community1CreateBody,
      },
    );
  typia.assert(community1);

  const community2CreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community2: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: community2CreateBody,
      },
    );
  typia.assert(community2);

  // 5. As memberUser, create a report in community1.
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community1.id,
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

  // 6. Register two community moderators: moderatorA and moderatorB.
  const moderatorAJoinBody = {
    username: `modA_${RandomGenerator.alphabets(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mods.example.com/join",
    referrer: "https://mods.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorAJoinBody,
    });
  typia.assert(moderatorAAuthorized);

  const moderatorBJoinBody = {
    username: `modB_${RandomGenerator.alphabets(6)}`,
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mods.example.com/join",
    referrer: "https://mods.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorBAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorBJoinBody,
    });
  typia.assert(moderatorBAuthorized);

  // 7. As moderatorA, create a moderation action for the report in community1.
  const moderationActionCreateBody = {
    community_id: community1.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: "Content violates community rules for spam.",
    notes_internal: "Automated test moderation action.",
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert(moderationAction);

  // Sanity check: moderatorA should be able to retrieve the moderation action.
  const moderationActionAsModA: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.at(
      connection,
      {
        moderationActionId: moderationAction.id,
      },
    );
  typia.assert(moderationActionAsModA);

  TestValidator.equals(
    "moderatorA can view their own community's moderation action",
    moderationActionAsModA.id,
    moderationAction.id,
  );

  // 8. Switch authentication to moderatorB using login.
  const moderatorBLoginBody = {
    identifier: moderatorBJoinBody.email,
    password: moderatorBJoinBody.password,
    ip: "127.0.0.1",
    href: "https://mods.example.com/login",
    referrer: "https://mods.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.ILogin;

  const moderatorBLoginAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: moderatorBLoginBody,
    });
  typia.assert(moderatorBLoginAuthorized);

  // 9. As moderatorB, attempt to retrieve moderationAction.id and expect an authorization error.
  await TestValidator.error(
    "moderatorB cannot view moderation actions from communities they do not manage",
    async () => {
      await api.functional.communityPlatform.communityModerator.moderationActions.at(
        connection,
        {
          moderationActionId: moderationAction.id,
        },
      );
    },
  );
}
