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
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_moderation_action_creation_with_internal_notes_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Register and auto-login a platform admin who can create visibility levels
  const platformAdminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // 2. Create a visibility level master record as platform admin
  const visibilityCode = `public_${RandomGenerator.alphabets(8)}`;
  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Public Community",
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  // 3. Register and auto-login a member user who will create a community
  const memberJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    ip: "127.0.0.1",
    href: "https://community.example.com/join",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. As member user, create a community using created visibility level code
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
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

  // 5. Register a community moderator (auto-login via join)
  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(16),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://mod.example.com/join",
    referrer: "https://mod.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 6. As community moderator, create a moderation action scoped to the community
  //    with rich internal notes and an optional reason summary.
  const reasonSummary = "Hate speech per policy section 4";
  const notesInternal = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 8,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 10,
  });

  const moderationCreateBody = {
    community_id: community.id,
    action_type: "label_content",
    target_scope: "community",
    reason_summary: reasonSummary,
    notes_internal: notesInternal,
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationCreateBody,
      },
    );
  typia.assert(moderationAction);

  // 7. Assert that reason_summary and notes_internal were persisted exactly
  TestValidator.equals(
    "moderation action reason_summary must match input",
    moderationAction.reason_summary,
    reasonSummary,
  );
  TestValidator.equals(
    "moderation action notes_internal must match input",
    moderationAction.notes_internal,
    notesInternal,
  );

  // Also assert that core linkage and classification fields are present and consistent
  TestValidator.predicate(
    "moderation action has a non-empty id",
    moderationAction.id.length > 0,
  );
  TestValidator.equals(
    "moderation action action_type must be label_content",
    moderationAction.action_type,
    "label_content",
  );
  TestValidator.equals(
    "moderation action target_scope must be community",
    moderationAction.target_scope,
    "community",
  );
}
