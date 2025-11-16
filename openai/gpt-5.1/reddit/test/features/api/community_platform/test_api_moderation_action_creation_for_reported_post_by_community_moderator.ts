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

export async function test_api_moderation_action_creation_for_reported_post_by_community_moderator(
  connection: api.IConnection,
) {
  // 1. Platform admin registers and creates a visibility level
  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(8),
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123!",
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphabets(8),
          name: "Public",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 2. Member user joins and logs in
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Password123!";

  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
      email: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/join",
      referrer: "https://community.example.com/home",
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  // Explicit login (even though join already authenticates) to demonstrate actor switching pattern
  const memberLogin = await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberEmail,
      password: memberPassword,
      ip: null,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com/home",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberLogin);

  // 3. Member user creates a community with the created visibility level code
  const communityCreateBody = {
    identifier: RandomGenerator.alphabets(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
    primaryTagIds: undefined,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 4. Member user creates a post in that community
  const postCreateBody = {
    community_id: community.id,
    post_type_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: postCreateBody,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  // 5. Member user creates a report associated to the community context
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 6. Community moderator joins and logs in
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Password123!";

  const moderatorJoin = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: moderatorPassword,
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://moderator.example.com/join",
        referrer: "https://moderator.example.com/home",
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(moderatorJoin);

  const moderatorLogin = await api.functional.auth.communityModerator.login(
    connection,
    {
      body: {
        identifier: moderatorEmail,
        password: moderatorPassword,
        ip: null,
        href: "https://moderator.example.com/login",
        referrer: "https://moderator.example.com/home",
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    moderatorLogin,
  );

  // 7. Community moderator creates a moderation action scoped to the community/post
  const moderationActionCreateBody = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 3 }),
    notes_internal: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction =
    await api.functional.communityPlatform.communityModerator.moderationActions.create(
      connection,
      {
        body: moderationActionCreateBody,
      },
    );
  typia.assert<ICommunityPlatformModerationAction>(moderationAction);

  // 8. Validate core fields of the created moderation action
  TestValidator.equals(
    "moderation action action_type must match request",
    moderationAction.action_type,
    moderationActionCreateBody.action_type,
  );
  TestValidator.equals(
    "moderation action target_scope must match request",
    moderationAction.target_scope,
    moderationActionCreateBody.target_scope,
  );

  // community_id can be null/undefined or echo the provided one; when defined, check match
  if (
    moderationAction.community_id !== null &&
    moderationAction.community_id !== undefined
  ) {
    TestValidator.equals(
      "moderation action community_id matches request community_id",
      moderationAction.community_id,
      moderationActionCreateBody.community_id,
    );
  }

  // actor summary should exist and be non-empty in its core fields when provided
  if (moderationAction.actor !== undefined) {
    typia.assert<ICommunityPlatformActor.ISummary>(moderationAction.actor);
    TestValidator.predicate(
      "actor.id has some uuid-like value",
      typeof moderationAction.actor.id === "string" &&
        moderationAction.actor.id.length > 0,
    );
    TestValidator.predicate(
      "actor.actorType is non-empty string",
      typeof moderationAction.actor.actorType === "string" &&
        moderationAction.actor.actorType.length > 0,
    );
    TestValidator.predicate(
      "actor.displayName is non-empty string",
      typeof moderationAction.actor.displayName === "string" &&
        moderationAction.actor.displayName.length > 0,
    );
  }
}
