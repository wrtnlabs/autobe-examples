import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformActor";
import type { ICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuditLog";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import type { ICommunityPlatformUserSanction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSanction";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuditLog";

export async function test_api_platform_admin_audit_log_search_by_actor_and_target(
  connection: api.IConnection,
) {
  // 1. Register and authenticate platform admin
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminJoinHref: string & tags.Format<"uri"> =
    "https://admin.join.example.com" as string & tags.Format<"uri">;
  const platformAdminJoinReferrer: string & tags.Format<"uri"> =
    "https://admin.referrer.example.com" as string & tags.Format<"uri">;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: platformAdminEmail,
        password: "Password!123",
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: platformAdminJoinHref,
        referrer: platformAdminJoinReferrer,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdmin);

  // 2. As platform admin, create a community visibility level
  const visibilityLevelCode = RandomGenerator.alphabets(8);
  const visibilityLevelName = RandomGenerator.name();

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityLevelCode,
          name: visibilityLevelName,
          description: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  // 3. As platform admin, create a post type to be used by posts
  const postTypeCode = RandomGenerator.alphabets(10);
  const postTypeName = RandomGenerator.name();

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: postTypeName,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 4. Register and authenticate a member user
  const memberUserEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const memberUserJoinHref: string & tags.Format<"uri"> =
    "https://member.join.example.com" as string & tags.Format<"uri">;
  const memberUserJoinReferrer: string & tags.Format<"uri"> =
    "https://member.referrer.example.com" as string & tags.Format<"uri">;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: memberUserEmail,
        password: "Password!123",
        ip: null,
        href: memberUserJoinHref,
        referrer: memberUserJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberAuthorized);

  const memberUserId = memberAuthorized.id;

  // 5. As member user, create a community using the visibility level
  const communityIdentifier = RandomGenerator.alphabets(10);
  const communityTitle = RandomGenerator.name();

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: communityIdentifier,
          title: communityTitle,
          description: RandomGenerator.paragraph({ sentences: 6 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  const communityId = community.id;

  // 6. As member user, create a post in the community
  const postTitle = RandomGenerator.paragraph({ sentences: 3 });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: {
        community_id: communityId,
        post_type_id: postType.id,
        title: postTitle,
        body: postBody,
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  const postId = post.id;

  // 7. As member user, create a comment on the post
  const commentBody = RandomGenerator.paragraph({ sentences: 4 });

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId,
        body: {
          body: commentBody,
          parentCommentId: undefined,
          renderingMode: "markdown",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);

  const commentId = comment.id;

  // 8. As member user, create a report
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: communityId,
          severity: null,
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert(report);

  const reportId = report.id;

  // 9. Register and authenticate a community moderator
  const moderatorEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorJoinHref: string & tags.Format<"uri"> =
    "https://moderator.join.example.com" as string & tags.Format<"uri">;
  const moderatorJoinReferrer: string & tags.Format<"uri"> =
    "https://moderator.referrer.example.com" as string & tags.Format<"uri">;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: moderatorEmail,
        password: "Password!123",
        display_name: RandomGenerator.name(),
        ip: null,
        href: moderatorJoinHref,
        referrer: moderatorJoinReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorAuthorized);

  const communityModeratorId = moderatorAuthorized.id;

  // 10. As community moderator, create a moderation action for the report
  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.communityModerator.reports.moderationActions.create(
      connection,
      {
        reportId,
        body: {
          community_id: communityId,
          action_type: "content_reviewed",
          target_scope: "report",
          reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
          notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformModerationAction.ICreate,
      },
    );
  typia.assert(moderationAction);

  const moderationActionId = moderationAction.id;

  // 11. As community moderator, create a community-scoped user sanction
  const sanctionEffectiveFrom = new Date().toISOString() as string &
    tags.Format<"date-time">;
  const sanctionEffectiveUntil = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;

  const userSanction: ICommunityPlatformUserSanction =
    await api.functional.communityPlatform.communityModerator.reports.userSanctions.create(
      connection,
      {
        reportId,
        body: {
          community_platform_report_id: reportId,
          sanctioned_memberuser_id: memberUserId,
          community_id: communityId,
          sanction_type: "temporary_community_ban",
          status: "active",
          effective_from: sanctionEffectiveFrom,
          effective_until: sanctionEffectiveUntil,
          reason_summary: RandomGenerator.paragraph({ sentences: 2 }),
          notes_internal: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformUserSanction.ICreate,
      },
    );
  typia.assert(userSanction);

  const userSanctionId = userSanction.id;

  // 12. Re-authenticate as platform admin to perform audit log queries
  const platformAdminLoginHref: string & tags.Format<"uri"> =
    "https://admin.login.example.com" as string & tags.Format<"uri">;
  const platformAdminLoginReferrer: string & tags.Format<"uri"> =
    "https://admin.login.referrer.example.com" as string & tags.Format<"uri">;

  const platformAdminLoginResult: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdminEmail,
        password: "Password!123",
        ip: null,
        href: platformAdminLoginHref,
        referrer: platformAdminLoginReferrer,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLoginResult);

  const platformAdminId = platformAdminLoginResult.id;

  const simulate: boolean = connection.simulate === true;

  // Helper to run an audit log query and assert filter consistency
  const assertFilteredBy = async (
    title: string,
    request: ICommunityPlatformAuditLog.IRequest,
    predicate: (entry: ICommunityPlatformAuditLog.ISummary) => boolean,
  ): Promise<void> => {
    const page: IPageICommunityPlatformAuditLog.ISummary =
      await api.functional.communityPlatform.platformAdmin.auditLogs.index(
        connection,
        {
          body: request,
        },
      );

    typia.assert<IPageICommunityPlatformAuditLog.ISummary>(page);

    if (simulate) return; // In simulate mode, skip logical consistency checks

    const data = page.data;

    if (data.length > 0) {
      await TestValidator.predicate(title, async () => {
        for (const entry of data) {
          if (!predicate(entry)) return false;
        }
        return true;
      });
    }
  };

  const basePage: number & tags.Type<"int32"> & tags.Minimum<1> = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1>;
  const baseLimit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200> = 50 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<200>;

  // 13-a. Filter by memberUserId
  await assertFilteredBy(
    "audit logs filtered by memberUserId should match the member user",
    {
      page: basePage,
      limit: baseLimit,
      memberUserId: memberUserId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.memberuser_id === memberUserId,
  );

  // 13-b. Filter by communityModeratorId
  await assertFilteredBy(
    "audit logs filtered by communityModeratorId should match moderator",
    {
      page: basePage,
      limit: baseLimit,
      communityModeratorId: communityModeratorId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.communitymoderator_id === communityModeratorId,
  );

  // 13-c. Filter by platformAdminId
  await assertFilteredBy(
    "audit logs filtered by platformAdminId should match platform admin",
    {
      page: basePage,
      limit: baseLimit,
      platformAdminId: platformAdminId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.platformadmin_id === platformAdminId,
  );

  // 13-d. Filter by communityId
  await assertFilteredBy(
    "audit logs filtered by communityId should match community",
    {
      page: basePage,
      limit: baseLimit,
      communityId: communityId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.community_id === communityId,
  );

  // 13-e. Filter by postId
  await assertFilteredBy(
    "audit logs filtered by postId should match post",
    {
      page: basePage,
      limit: baseLimit,
      postId: postId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.post_id === postId,
  );

  // 13-f. Filter by commentId
  await assertFilteredBy(
    "audit logs filtered by commentId should match comment",
    {
      page: basePage,
      limit: baseLimit,
      commentId: commentId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.comment_id === commentId,
  );

  // 13-g. Filter by reportId
  await assertFilteredBy(
    "audit logs filtered by reportId should match report",
    {
      page: basePage,
      limit: baseLimit,
      reportId: reportId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.report_id === reportId,
  );

  // 13-h. Filter by userSanctionId
  await assertFilteredBy(
    "audit logs filtered by userSanctionId should match user sanction",
    {
      page: basePage,
      limit: baseLimit,
      userSanctionId: userSanctionId,
      sortBy: "created_at",
      sortDirection: "desc",
    },
    (entry) => entry.user_sanction_id === userSanctionId,
  );
}
