import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostState";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportOfComments } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportOfComments";
import type { ICommunityPlatformReportReasonCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReasonCategory";

export async function test_api_communitymoderator_reported_comment_for_unrelated_community_forbidden(
  connection: api.IConnection,
) {
  // 1. Create actors: platformAdmin, communityModerator, memberUser
  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "member-password-1234",
    ip: null,
    href: "https://client.example.com/join/member",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "platform-admin-password-1234",
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://client.example.com/join/platform-admin",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const communityModeratorJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "community-moderator-password-1234",
    display_name: RandomGenerator.name(2),
    ip: null,
    href: "https://client.example.com/join/community-moderator",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const communityModeratorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: communityModeratorJoinBody,
    });
  typia.assert(communityModeratorAuthorized);

  // 2. As platformAdmin, create visibility level and post type
  const visibilityLevelBody = {
    code: `public-${RandomGenerator.alphaNumeric(8)}`,
    name: "Public",
    description: "Publicly visible community",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeBody = {
    code: `text-${RandomGenerator.alphaNumeric(8)}`,
    name: "Text Post",
    description: "Simple text-only post type for testing.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeBody,
      },
    );
  typia.assert(postType);

  // 3. As memberUser, create communities A and B
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      ip: null,
      href: "https://client.example.com/login/member",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityACreateBody = {
    identifier: `community-a-${RandomGenerator.alphaNumeric(6)}`,
    title: "Community A",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevelBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityA: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityACreateBody,
      },
    );
  typia.assert(communityA);

  const communityBCreateBody = {
    identifier: `community-b-${RandomGenerator.alphaNumeric(6)}`,
    title: "Community B",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevelBody.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const communityB: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBCreateBody,
      },
    );
  typia.assert(communityB);

  // 3-2. As memberUser, create posts and comments in communities
  const postACreateBody = {
    community_id: communityA.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const postA: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postACreateBody,
    });
  typia.assert(postA);

  const postBCreateBody = {
    community_id: communityB.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: null,
    image_uri: null,
  } satisfies ICommunityPlatformPost.ICreate;

  const postB: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBCreateBody,
    });
  typia.assert(postB);

  const commentACreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const commentA: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postA.id,
        body: commentACreateBody,
      },
    );
  typia.assert(commentA);

  const commentBCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentCommentId: undefined,
    renderingMode: "markdown",
  } satisfies ICommunityPlatformComment.ICreate;

  const commentB: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: postB.id,
        body: commentBCreateBody,
      },
    );
  typia.assert(commentB);

  // For reports, we need a report_reason_category_id; use random UUID to satisfy type
  const reportReasonCategoryId = typia.random<string & tags.Format<"uuid">>();

  const reportABody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: communityA.id,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportA: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportABody,
      },
    );
  typia.assert(reportA);

  const reportBBody = {
    reporter_type: "member",
    report_reason_category_id: reportReasonCategoryId,
    community_id: communityB.id,
    severity: null,
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const reportB: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportBBody,
      },
    );
  typia.assert(reportB);

  // 4. As platformAdmin, assign communityModerator to Community A only
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoinBody.email,
      password: platformAdminJoinBody.password,
      ip: null,
      href: "https://client.example.com/login/platform-admin",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const assignmentBody = {
    communityModeratorId: communityModeratorAuthorized.id,
    assignedAt: new Date().toISOString(),
    revokedAt: null,
    isActive: true,
  } satisfies ICommunityPlatformCommunityModeratorAssignment.ICreate;

  const assignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: communityA.identifier,
        body: assignmentBody,
      },
    );
  typia.assert(assignment);

  // 5. As communityModerator, query reported comments
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: communityModeratorJoinBody.email,
      password: communityModeratorJoinBody.password,
      ip: null,
      href: "https://client.example.com/login/community-moderator",
      referrer: "https://client.example.com/landing",
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  // 5-1. Allowed case: reportId_A
  const reportedCommentA: ICommunityPlatformReportOfComments =
    await api.functional.communityPlatform.communityModerator.reports.comment.at(
      connection,
      {
        reportId: reportA.id,
      },
    );
  typia.assert(reportedCommentA);

  TestValidator.equals(
    "reportedCommentA.report_id matches reportA.id",
    reportedCommentA.report_id,
    reportA.id,
  );

  TestValidator.equals(
    "reportedCommentA.comment.id matches created commentA.id",
    reportedCommentA.comment.id,
    commentA.id,
  );

  TestValidator.equals(
    "reportedCommentA.comment.post.id matches postA.id",
    reportedCommentA.comment.post.id,
    postA.id,
  );

  TestValidator.equals(
    "reportedCommentA.comment.post.community.id matches communityA.id",
    reportedCommentA.comment.post.community.id,
    communityA.id,
  );

  TestValidator.equals(
    "reportedCommentA.comment.body matches original comment body",
    reportedCommentA.comment.body,
    commentA.body,
  );

  // 5-2. Forbidden case: reportId_B from unrelated community
  await TestValidator.error(
    "community moderator cannot access report for unrelated community",
    async () => {
      await api.functional.communityPlatform.communityModerator.reports.comment.at(
        connection,
        {
          reportId: reportB.id,
        },
      );
    },
  );
}
