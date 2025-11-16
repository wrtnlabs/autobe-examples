import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
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

/**
 * Happy-path: community moderator retrieves detailed comment for an existing
 * comment-targeted report within a community they moderate.
 *
 * Business flow:
 *
 * 1. Create three actors via auth APIs: memberUser, platformAdmin,
 *    communityModerator.
 * 2. As platformAdmin, create a community visibility level and a post type.
 * 3. As memberUser, create a community using that visibility level, then a post
 *    and a comment.
 * 4. As memberUser, create a top-level report that is linked to the comment by
 *    backend behavior.
 * 5. As communityModerator, call GET
 *    /communityPlatform/communityModerator/reports/{reportId}/comment.
 * 6. Validate that the returned ICommunityPlatformReportOfComments links back to
 *    the created report, comment, post, and community, and that the comment
 *    body is non-empty.
 */
export async function test_api_communitymoderator_reported_comment_retrieval_happy_path(
  connection: api.IConnection,
) {
  // 1. Create actors: memberUser, platformAdmin, communityModerator
  const memberJoinHref = "https://example.com/member/join" as string &
    tags.Format<"uri">;
  const memberJoinReferrer = "https://example.com/landing" as string &
    tags.Format<"uri">;

  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-member-1234",
    href: memberJoinHref,
    referrer: memberJoinReferrer,
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  const platformJoinHref = "https://example.com/admin/join" as string &
    tags.Format<"uri">;
  const platformJoinReferrer = "https://example.com/admin/landing" as string &
    tags.Format<"uri">;

  const platformJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-admin-1234",
    displayName: RandomGenerator.name(),
    href: platformJoinHref,
    referrer: platformJoinReferrer,
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  const moderatorJoinHref = "https://example.com/moderator/join" as string &
    tags.Format<"uri">;
  const moderatorJoinReferrer =
    "https://example.com/moderator/landing" as string & tags.Format<"uri">;

  const moderatorJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "password-moderator-1234",
    href: moderatorJoinHref,
    referrer: moderatorJoinReferrer,
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const moderatorAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderatorAuthorized);

  // 2. As platformAdmin, create visibility level and post type
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformJoinBody.email,
      password: platformJoinBody.password,
      href: platformJoinHref,
      referrer: platformJoinReferrer,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCreateBody = {
    code: "public",
    name: "Public",
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibilityLevel);

  const postTypeCreateBody = {
    code: "text",
    name: "Text Post",
    description: "Simple text-based post type for general discussions.",
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert(postType);

  // 3. As memberUser, create community, post, comment
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoinBody.email,
      password: memberJoinBody.password,
      href: memberJoinHref,
      referrer: memberJoinReferrer,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const communityIdentifier = `community_${RandomGenerator.alphabets(6)}`;
  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibilityLevelCode: visibilityLevel.code,
    isNsfw: false,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: RandomGenerator.paragraph({ sentences: 4 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformComment.ICreate;

  const comment: ICommunityPlatformComment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 4. As memberUser, create a top-level report (assumed linked to the comment)
  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  // 5. As communityModerator, call GET /communityPlatform/communityModerator/reports/{reportId}/comment
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: moderatorJoinBody.email,
      password: moderatorJoinBody.password,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const reportedComment: ICommunityPlatformReportOfComments =
    await api.functional.communityPlatform.communityModerator.reports.comment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(reportedComment);

  // 6. Assertions: linkage and basic content checks
  TestValidator.equals(
    "report_of_comments.report_id matches created report.id",
    reportedComment.report_id,
    report.id,
  );

  TestValidator.equals(
    "embedded comment.id matches created comment.id",
    reportedComment.comment.id,
    comment.id,
  );

  TestValidator.equals(
    "embedded comment.post.id matches created post.id",
    reportedComment.comment.post.id,
    post.id,
  );

  TestValidator.equals(
    "embedded comment.post.community.id matches created community.id",
    reportedComment.comment.post.community.id,
    community.id,
  );

  TestValidator.predicate(
    "reported comment body should be non-empty",
    reportedComment.comment.body.length > 0,
  );
}
