import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentState } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentState";
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

export async function test_api_platformadmin_reported_comment_respects_comment_state(
  connection: api.IConnection,
) {
  // 1. Register a platform admin (also logs in and sets Authorization header)
  const platformAdminJoinHref = "https://admin.example.com/join";
  const platformAdminJoinReferrer = "https://admin.example.com/landing";

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: {
        username: RandomGenerator.alphabets(12),
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword!123",
        displayName: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: platformAdminJoinHref as string & tags.Format<"uri">,
        referrer: platformAdminJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    });
  typia.assert(platformAdmin);

  // 2. As platformAdmin, create visibility level and post type
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: `vis_${RandomGenerator.alphabets(8)}`,
          name: "Test Visibility",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert(visibilityLevel);

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: `ptype_${RandomGenerator.alphabets(8)}`,
          name: "Text Post Type",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert(postType);

  // 3. Register and login a memberUser
  const memberJoinHref = "https://community.example.com/join" as string &
    tags.Format<"uri">;
  const memberJoinReferrer = "https://community.example.com/landing" as string &
    tags.Format<"uri">;

  const memberJoin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: "MemberPassword!123",
        ip: "127.0.0.1",
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.IJoinRequest,
    });
  typia.assert(memberJoin);

  // The join call already authenticates the member and sets Authorization header.
  // Still, perform an explicit login flow to ensure login path works and to
  // demonstrate actor switching later.
  const memberLogin: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: "MemberPassword!123",
        ip: "127.0.0.1",
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLogin);

  // 4. As memberUser, create a community using created visibility level
  const communityCreateBody = {
    identifier: `community_${RandomGenerator.alphabets(6)}`,
    title: "Reported comment test community",
    description: RandomGenerator.paragraph({ sentences: 6 }),
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

  // 5. As memberUser, create a post in that community using the created post type
  const postCreateBody = {
    community_id: community.id,
    post_type_id: postType.id,
    title: "Reported comment moderation state test post",
    body: RandomGenerator.paragraph({ sentences: 8 }),
    url: undefined,
    image_uri: undefined,
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postCreateBody,
    });
  typia.assert(post);

  TestValidator.equals(
    "post community id should match community.id",
    post.community.id,
    community.id,
  );

  // 6. As memberUser, create a comment under that post
  const commentCreateBody = {
    body: "This is a comment that will be moderated and reported.",
    parentCommentId: undefined,
    renderingMode: "plainText",
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

  TestValidator.equals(
    "comment.post.id should match post.id",
    comment.post.id,
    post.id,
  );

  // 7. Register and login a communityModerator
  const moderatorJoinHref = "https://moderator.example.com/join" as string &
    tags.Format<"uri">;
  const moderatorJoinReferrer =
    "https://moderator.example.com/landing" as string & tags.Format<"uri">;

  const moderatorJoin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email: typia.random<string & tags.Format<"email">>(),
        password: "ModeratorPassword!123",
        display_name: RandomGenerator.name(),
        ip: "127.0.0.1",
        href: moderatorJoinHref,
        referrer: moderatorJoinReferrer,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert(moderatorJoin);

  const moderatorLogin: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.login(connection, {
      body: {
        identifier: moderatorJoin.id,
        password: "ModeratorPassword!123",
        ip: "127.0.0.1",
        href: moderatorJoinHref,
        referrer: moderatorJoinReferrer,
      } satisfies ICommunityPlatformCommunityModerator.ILogin,
    });
  typia.assert(moderatorLogin);

  // 8. As communityModerator, update the comment state to a non-default state
  const commentStateUpdateBody = {
    visibility_state: "soft_removed",
    lock_state: "locked_replies",
    collapse_state: "collapsed",
    moderation_state: "removed_policy_violation",
    moderation_reason: "Contains policy-violating content (test).",
  } satisfies ICommunityPlatformCommentState.IUpdate;

  const updatedState: ICommunityPlatformCommentState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: commentStateUpdateBody,
      },
    );
  typia.assert(updatedState);

  TestValidator.equals(
    "updated comment state should be associated to the same comment id",
    updatedState.comment_id,
    comment.id,
  );

  // 9. Switch back to memberUser context and create a report targeting this comment
  const memberLoginAgain: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: {
        identifier: memberJoin.email,
        password: "MemberPassword!123",
        ip: "127.0.0.1",
        href: memberJoinHref,
        referrer: memberJoinReferrer,
      } satisfies ICommunityPlatformMemberuser.ILoginRequest,
    });
  typia.assert(memberLoginAgain);

  const reportCreateBody = {
    reporter_type: "member",
    report_reason_category_id: typia.random<string & tags.Format<"uuid">>(),
    community_id: community.id,
    severity: "medium",
    description: "The comment appears to violate community guidelines.",
  } satisfies ICommunityPlatformReport.ICreate;

  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: reportCreateBody,
      },
    );
  typia.assert(report);

  TestValidator.equals(
    "report.context_community.id should match community.id when present",
    report.context_community?.id ?? community.id,
    community.id,
  );

  // 10. Switch to platformAdmin context and fetch the reported comment via report-comment endpoint
  const platformAdminLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: {
        identifier: platformAdmin.email,
        password: "AdminPassword!123",
        ip: "127.0.0.1",
        href: platformAdminJoinHref as string & tags.Format<"uri">,
        referrer: platformAdminJoinReferrer as string & tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.ILogin,
    });
  typia.assert(platformAdminLogin);

  const reportedCommentView: ICommunityPlatformReportOfComments =
    await api.functional.communityPlatform.platformAdmin.reports.comment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert(reportedCommentView);

  // 11. Business-level assertions: linkage and state consistency
  TestValidator.equals(
    "reportOfComments.report_id should equal original report id",
    reportedCommentView.report_id,
    report.id,
  );

  // Ensure that the comment returned corresponds to our original comment.
  TestValidator.equals(
    "reportedCommentView.comment.id should equal original comment id",
    reportedCommentView.comment.id,
    comment.id,
  );

  TestValidator.equals(
    "reported comment's post id should equal original post id",
    reportedCommentView.comment.post.id,
    post.id,
  );

  TestValidator.equals(
    "reported comment's author id should equal original author id",
    reportedCommentView.comment.author.id,
    comment.author.id,
  );

  // We expect that the comment state change (soft removal) is respected in the
  // reporting view. At minimum, a soft-removed comment should have non-null
  // deleted_at and should not look like an obviously active comment.
  TestValidator.predicate(
    "reported comment should reflect some removal lifecycle in deleted_at",
    reportedCommentView.comment.deleted_at !== null,
  );
}
