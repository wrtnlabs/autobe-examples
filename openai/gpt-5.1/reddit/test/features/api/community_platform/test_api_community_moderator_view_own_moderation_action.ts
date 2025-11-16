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
 * Validate that a community moderator can retrieve details of a moderation
 * action they created.
 *
 * Business goal
 *
 * - Ensure that once a community moderator records a moderation decision, they
 *   can fetch its details later via the communityModerator detail endpoint, and
 *   that the DTO is internally consistent between creation and subsequent
 *   retrieval.
 *
 * High-level flow
 *
 * 1. Register a platform admin and create a community visibility level the member
 *    user can use.
 * 2. Register a member user and create a community with that visibility level.
 * 3. As the member user, create a report within that community (to simulate
 *    moderation context).
 * 4. Register a community moderator and authenticate as that moderator.
 * 5. As the moderator, create a moderation action associated with the community
 *    context.
 * 6. As the same moderator, fetch the moderation action via the detail endpoint.
 * 7. Assert that key fields are consistent between the create and read responses
 *    (id, community_id, action_type, target_scope, reason_summary,
 *    notes_internal) and that an actor summary is present.
 */
export async function test_api_community_moderator_view_own_moderation_action(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: "P@ssw0rd!",
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const visibilityCreateBody = {
    code: `vis_${RandomGenerator.alphabets(6)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);

  // 2. Member user joins and creates a community using the created visibility level
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@member.example.com`,
    password: "P@ssw0rd!",
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/home",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // 3. Member user creates a report in that community (context for moderation)
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "low",
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

  // 4. Community moderator joins (connection Authorization is switched by SDK)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphabets(8)}@moderator.example.com`,
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://moderator.console.example.com/join",
    referrer: "https://moderator.console.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 5. As the moderator, create a moderation action for this community context
  const moderationCreateBody = {
    community_id: community.id,
    action_type: "warn_user",
    target_scope: "user",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const createdAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationCreateBody,
      },
    );
  typia.assert(createdAction);

  // Sanity checks on created action
  TestValidator.equals(
    "created action should reference the community via community_id",
    createdAction.community_id,
    community.id,
  );
  TestValidator.equals(
    "created action type should match payload",
    createdAction.action_type,
    moderationCreateBody.action_type,
  );
  TestValidator.equals(
    "created action target_scope should match payload",
    createdAction.target_scope,
    moderationCreateBody.target_scope,
  );
  TestValidator.equals(
    "created action reason_summary should match payload",
    createdAction.reason_summary,
    moderationCreateBody.reason_summary,
  );
  TestValidator.equals(
    "created action notes_internal should match payload",
    createdAction.notes_internal,
    moderationCreateBody.notes_internal,
  );

  // 6. Fetch the moderation action via detail endpoint as same moderator
  const fetchedAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.at(
      connection,
      {
        moderationActionId: createdAction.id,
      },
    );
  typia.assert(fetchedAction);

  // 7. Assertions: ensure fetched DTO is consistent with created action
  TestValidator.equals(
    "fetched action id must equal created action id",
    fetchedAction.id,
    createdAction.id,
  );
  TestValidator.equals(
    "fetched action community_id must equal community id",
    fetchedAction.community_id,
    community.id,
  );
  TestValidator.equals(
    "fetched action action_type must equal created action action_type",
    fetchedAction.action_type,
    createdAction.action_type,
  );
  TestValidator.equals(
    "fetched action target_scope must equal created action target_scope",
    fetchedAction.target_scope,
    createdAction.target_scope,
  );
  TestValidator.equals(
    "fetched action reason_summary must equal created action reason_summary",
    fetchedAction.reason_summary,
    createdAction.reason_summary,
  );
  TestValidator.equals(
    "fetched action notes_internal must equal created action notes_internal",
    fetchedAction.notes_internal,
    createdAction.notes_internal,
  );

  // Validate actor summary presence (cannot strongly assert linkage in this scope)
  TestValidator.predicate(
    "fetched action actor summary should be present",
    fetchedAction.actor !== undefined,
  );

  if (fetchedAction.actor !== undefined) {
    TestValidator.predicate(
      "actor id should be a non-empty UUID-like string",
      typeof fetchedAction.actor.id === "string" &&
        fetchedAction.actor.id.length > 0,
    );
  }
}
