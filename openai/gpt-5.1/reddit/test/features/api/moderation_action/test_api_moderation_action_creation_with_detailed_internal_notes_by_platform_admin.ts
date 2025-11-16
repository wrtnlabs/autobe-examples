import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

/**
 * Validate that a platform administrator can create a moderation action with
 * detailed internal notes and a concise reason summary.
 *
 * Business context: Platform admins need to record rich rationale for
 * enforcement decisions (policy references, prior history, investigation notes)
 * without these fields affecting the functional semantics of the moderation
 * action itself. The API exposes `reason_summary` and `notes_internal` as
 * optional text fields on `ICommunityPlatformModerationAction.ICreate` and
 * should persist them as-is on the created moderation action record.
 *
 * Scenario steps (rewritten to use only realistic, valid auth flows):
 *
 * 1. Register a member user via /auth/memberUser/join; this both creates the
 *    member and authenticates them, but we will later re-login with the same
 *    password when we need to switch actor context.
 * 2. Register a platform admin via /auth/platformAdmin/join; this creates and
 *    authenticates the platform admin.
 * 3. As the platform admin (immediately after join), create a community visibility
 *    level using /communityPlatform/platformAdmin/communityVisibilityLevels
 *    with a unique `code` and `name` so communities can be created against it.
 * 4. Switch to the member user by calling /auth/memberUser/login with the same
 *    credentials used at join, and create a community using
 *    /communityPlatform/memberUser/communities.create with the
 *    visibilityLevelCode that was just registered.
 * 5. Still as the member user, create a post in that community via
 *    /communityPlatform/memberUser/posts.create. Because we do not have a post
 *    type master API, use typia.random to generate a UUID `post_type_id`,
 *    trusting the backend simulation behavior.
 * 6. As the member, file a generic report via
 *    /communityPlatform/memberUser/reports.create with reporter_type "member",
 *    a random report_reason_category_id, the community_id, and non-empty
 *    description text.
 * 7. Switch back to the platform admin by calling /auth/platformAdmin/login with
 *    the same identifier and password used at join.
 * 8. As the platform admin, construct a moderation action creation body using
 *    ICommunityPlatformModerationAction.ICreate:
 *
 *    - Community_id set to the created community's id
 *    - Target_scope = "post"
 *    - Action_type = one of ["label_content", "remove_content"]
 *    - Reason_summary = a short, human-readable explanation string
 *    - Notes_internal = a long multi-paragraph string generated with
 *         RandomGenerator.content(...) to simulate detailed internal notes.
 * 9. Call api.functional.communityPlatform.platformAdmin.moderationActions.create
 *    with this body and await the response.
 * 10. Run typia.assert on the returned ICommunityPlatformModerationAction to ensure
 *     structural correctness.
 * 11. Using TestValidator.equals, verify that:
 *
 *     - Response.action_type equals the requested action_type
 *     - Response.target_scope equals "post"
 *     - Response.reason_summary equals the input reason_summary
 *     - Response.notes_internal equals the input notes_internal
 * 12. If response.actor is present, assert via TestValidator.equals that
 *     actor.actorType is "platformadmin" to confirm the acting role.
 * 13. If response.community is present, assert that its id matches the created
 *     community's id.
 */
export async function test_api_moderation_action_creation_with_detailed_internal_notes_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a member user (keep credentials for later login)
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberEmail = `${RandomGenerator.alphabets(8)}@example.com`;
  const memberUsername = RandomGenerator.alphabets(12);

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail as string & tags.Format<"email">,
      password: memberPassword,
      ip: null,
      href: "https://member.join.example.com" as string & tags.Format<"uri">,
      referrer: "https://landing.example.com" as string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert(memberJoin);

  // 2. Register a platform admin (keep credentials for later login)
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminEmail = `${RandomGenerator.alphabets(8)}@admin.example.com`;
  const adminUsername = RandomGenerator.alphabets(10);

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: adminUsername,
        email: adminEmail as string & tags.Format<"email">,
        password: adminPassword,
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://platform.admin.join" as string & tags.Format<"uri">,
        referrer: "https://platform.admin.landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert(platformAdminJoin);

  // At this point, connection is authenticated as platform admin due to join.

  // 3. Create a community visibility level as platform admin
  const visibilityCode = `vis_${RandomGenerator.alphaNumeric(8)}`;
  const visibilityLevelCreateBody = {
    code: visibilityCode,
    name: "Public with Reporting",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      { body: visibilityLevelCreateBody },
    );
  typia.assert(visibilityLevel);

  // 4. Switch to member user: login with same credentials used at join
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://member.login.example.com" as string & tags.Format<"uri">,
      referrer: "https://landing.example.com/login" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert(memberLogin);

  // 5. Create a community as the member user
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityCreateBody },
    );
  typia.assert(community);

  // 6. Create a post in the community as the member user
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 10,
    }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    { body: postCreateBody },
  );
  typia.assert(post);

  // 7. Create a report as the member user
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 8. Switch back to platform admin by logging in with correct credentials
  const platformAdminLogin = await api.functional.auth.platformAdmin.login(
    connection,
    {
      body: {
        identifier: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://platform.admin.login" as string & tags.Format<"uri">,
        referrer: "https://platform.admin.landing/login" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    },
  );
  typia.assert(platformAdminLogin);

  // 9. Build moderation action payload with detailed internal notes
  const actionTypeOptions = ["label_content", "remove_content"] as const;
  const chosenActionType = RandomGenerator.pick(actionTypeOptions);

  const reasonSummary =
    "Content labeled due to potential policy violation in post body";
  const internalNotes = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 8,
    sentenceMax: 16,
    wordMin: 4,
    wordMax: 10,
  });

  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: chosenActionType,
    target_scope: "post",
    reason_summary: reasonSummary,
    notes_internal: internalNotes,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      { body: moderationActionCreateBody },
    );
  typia.assert(moderationAction);

  // 10. Validate echoing of fields and persistence of notes
  TestValidator.equals(
    "moderation action type should echo request",
    moderationAction.action_type,
    chosenActionType,
  );
  TestValidator.equals(
    "moderation action target_scope should be 'post'",
    moderationAction.target_scope,
    "post",
  );
  TestValidator.equals(
    "reason_summary should match input",
    moderationAction.reason_summary,
    reasonSummary,
  );
  TestValidator.equals(
    "notes_internal should match input",
    moderationAction.notes_internal,
    internalNotes,
  );

  if (moderationAction.actor !== undefined) {
    TestValidator.equals(
      "actorType should indicate platformadmin when present",
      moderationAction.actor.actorType,
      "platformadmin",
    );
  }

  if (
    moderationAction.community !== undefined &&
    moderationAction.community !== null
  ) {
    TestValidator.equals(
      "moderation action community id should match created community",
      moderationAction.community.id,
      community.id,
    );
  }
}
