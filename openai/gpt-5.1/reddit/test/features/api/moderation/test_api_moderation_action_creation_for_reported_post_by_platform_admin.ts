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

export async function test_api_moderation_action_creation_for_reported_post_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Platform admin (later) will need a visibility level; create it up front.
  const visibilityCode = `public-${RandomGenerator.alphaNumeric(8)}`;
  const visibilityName = `Public ${RandomGenerator.name(1)}`;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: visibilityName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 2. Register a member user (this also authenticates as memberUser).
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = RandomGenerator.alphaNumeric(16);

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: memberUsername,
        email: memberEmail,
        password: memberPassword,
        ip: "127.0.0.1",
        href: "https://client.example.com/join",
        referrer: "https://client.example.com/landing",
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // Now `connection` is authenticated as memberUser.

  // 3. Create a community using the visibility level code as the member user.
  const communityIdentifier = `community_${RandomGenerator.alphaNumeric(10)}`;
  const communityTitle = RandomGenerator.paragraph({ sentences: 3 });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 8 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create a post in the community as the member user.
  const basePostCreate = typia.random<ICommunityPlatformPost.ICreate>();
  const postCreate = {
    ...basePostCreate,
    community_id: community.id,
    title:
      basePostCreate.title.length > 0
        ? basePostCreate.title
        : RandomGenerator.paragraph({ sentences: 3 }),
    body: basePostCreate.body ?? RandomGenerator.paragraph({ sentences: 8 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreate,
    });
  typia.assert(post);

  TestValidator.equals(
    "created post belongs to expected community",
    post.community.id,
    community.id,
  );

  // 5. Create a report associated with the community (conceptually for the post).
  // Binding to the specific post is handled by subsidiary tables not exposed here.
  const baseReportCreate = typia.random<ICommunityPlatformReport.ICreate>();
  const reportCreate = {
    ...baseReportCreate,
    reporter_type: "member", // explicit, consistent with an authenticated member user
    community_id: community.id,
    description:
      baseReportCreate.description ??
      RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreate,
      },
    );
  typia.assert(report);

  TestValidator.equals(
    "report has expected reporter_type",
    report.reporter_type,
    reportCreate.reporter_type,
  );

  // 6. Negative path: member user must not be able to create platformAdmin moderation actions.
  await TestValidator.error(
    "member user cannot create platformAdmin moderation actions",
    async () => {
      const unauthModerationBody = {
        community_id: community.id,
        action_type: "remove_content",
        target_scope: "post",
        reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
        notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformModerationAction.ICreate;

      await api.functional.communityPlatform.platformAdmin.moderationActions.create(
        connection,
        {
          body: unauthModerationBody,
        },
      );
    },
  );

  // 7. Register a platform administrator (this call also authenticates as platformAdmin).
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: adminUsername,
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(18),
        displayName: RandomGenerator.name(),
        ip: "127.0.0.2",
        href: "https://admin.example.com/join",
        referrer: "https://admin.example.com/landing",
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdmin);

  // After this call, `connection` is authenticated as platformAdmin.

  // 8. Positive path: platform admin creates a moderation action.
  const moderationActionCreate = {
    community_id: community.id,
    action_type: "remove_content",
    target_scope: "post",
    reason_summary: RandomGenerator.paragraph({ sentences: 4 }),
    notes_internal: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.platformAdmin.moderationActions.create(
      connection,
      {
        body: moderationActionCreate,
      },
    );
  typia.assert(moderationAction);

  // 9. Validate that the moderation action is correctly linked and actor is platformadmin.
  TestValidator.equals(
    "moderation action community_id matches created community",
    moderationAction.community_id,
    moderationActionCreate.community_id,
  );

  if (moderationAction.community) {
    typia.assert(moderationAction.community);
    TestValidator.equals(
      "embedded community summary id matches community.id",
      moderationAction.community.id,
      community.id,
    );
  }

  TestValidator.predicate(
    "moderation action has a non-empty report id",
    typeof moderationAction.community_platform_report_id === "string" &&
      moderationAction.community_platform_report_id.length > 0,
  );

  TestValidator.predicate(
    "moderation action has an actor summary",
    !!moderationAction.actor,
  );

  if (moderationAction.actor) {
    const actor: ICommunityPlatformActor.ISummary = moderationAction.actor;
    typia.assert(actor);
    TestValidator.equals(
      "actor type is platformadmin for platform-level moderation action",
      actor.actorType,
      "platformadmin",
    );
  }
}
