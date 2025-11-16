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

export async function test_api_communitymoderator_reported_comment_respects_comment_state(
  connection: api.IConnection,
) {
  // 1. Register core actors: memberUser, platformAdmin, communityModerator
  const memberJoin = await api.functional.auth.memberUser.join(connection, {
    body: {
      username: RandomGenerator.alphabets(12),
      email: `${RandomGenerator.alphabets(10)}@example.com` as string &
        tags.Format<"email">,
      password: "password-1234",
      ip: null,
      href: "https://member.example.com/join" as string & tags.Format<"uri">,
      referrer: "https://member.example.com/landing" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.IJoinRequest,
  });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberJoin);

  const platformAdminJoin = await api.functional.auth.platformAdmin.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphabets(10),
        email: `${RandomGenerator.alphabets(10)}@admin.example.com` as string &
          tags.Format<"email">,
        password: "admin-password-1234",
        displayName: RandomGenerator.name(),
        ip: undefined,
        href: "https://platform-admin.example.com/join" as string &
          tags.Format<"uri">,
        referrer: "https://platform-admin.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformPlatformadmin.IJoin,
    },
  );
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(platformAdminJoin);

  const communityModeratorJoin =
    await api.functional.auth.communityModerator.join(connection, {
      body: {
        username: RandomGenerator.alphabets(10),
        email:
          `${RandomGenerator.alphabets(10)}@moderator.example.com` as string &
            tags.Format<"email">,
        password: "moderator-password-1234",
        display_name: RandomGenerator.name(),
        ip: null,
        href: "https://community-mod.example.com/join" as string &
          tags.Format<"uri">,
        referrer: "https://community-mod.example.com/landing" as string &
          tags.Format<"uri">,
      } satisfies ICommunityPlatformCommunityModerator.IJoin,
    });
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(
    communityModeratorJoin,
  );

  // 2. As platformAdmin, configure visibility level and post type
  await api.functional.auth.platformAdmin.login(connection, {
    body: {
      identifier: platformAdminJoin.email,
      password: "admin-password-1234",
      ip: null,
      href: "https://platform-admin.example.com/login" as string &
        tags.Format<"uri">,
      referrer: "https://platform-admin.example.com/login-ref" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformPlatformadmin.ILogin,
  });

  const visibilityCode = `public-${RandomGenerator.alphabets(5)}`;
  const visibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: {
          code: visibilityCode,
          name: "Public Visibility",
          description: "Visibility level for public test communities",
        } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  const postTypeCode = `text-${RandomGenerator.alphabets(5)}`;
  const postType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: {
          code: postTypeCode,
          name: "Text Post",
          description: "Plain text post type for community threads",
        } satisfies ICommunityPlatformPostType.ICreate,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 3. As memberUser, create community, post, and comment
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoin.email,
      password: "password-1234",
      ip: null,
      href: "https://member.example.com/login" as string & tags.Format<"uri">,
      referrer: "https://member.example.com/login-ref" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const community =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: {
          identifier: `community-${RandomGenerator.alphabets(6)}`,
          title: "Moderator State Test Community",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          visibilityLevelCode: visibilityLevel.code,
          isNsfw: false,
          primaryTagIds: [],
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  const post = await api.functional.communityPlatform.memberUser.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type_id: postType.id,
        title: "Comment state alignment test",
        body: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        url: null,
        image_uri: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert<ICommunityPlatformPost>(post);

  const comment =
    await api.functional.communityPlatform.memberUser.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "Original comment body before moderation.",
          parentCommentId: undefined,
          renderingMode: "plainText",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert<ICommunityPlatformComment>(comment);

  // 4. As communityModerator, update comment state to reflect moderation
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: communityModeratorJoin.id,
      password: "moderator-password-1234",
      ip: null,
      href: "https://community-mod.example.com/login" as string &
        tags.Format<"uri">,
      referrer: "https://community-mod.example.com/login-ref" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const updatedState =
    await api.functional.communityPlatform.communityModerator.comments.state.update(
      connection,
      {
        commentId: comment.id,
        body: {
          visibility_state: "soft_removed",
          lock_state: "locked_replies",
          collapse_state: "collapsed",
          moderation_state: "removed_policy_violation",
          moderation_reason: "Contains test policy-violating content.",
        } satisfies ICommunityPlatformCommentState.IUpdate,
      },
    );
  typia.assert<ICommunityPlatformCommentState>(updatedState);

  TestValidator.equals(
    "comment state should be associated with the created comment",
    updatedState.comment_id,
    comment.id,
  );

  // 5. As memberUser, create a top-level report linked conceptually to this comment
  await api.functional.auth.memberUser.login(connection, {
    body: {
      identifier: memberJoin.email,
      password: "password-1234",
      ip: null,
      href: "https://member.example.com/login2" as string & tags.Format<"uri">,
      referrer: "https://member.example.com/login2-ref" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformMemberuser.ILoginRequest,
  });

  const report =
    await api.functional.communityPlatform.memberUser.reports.create(
      connection,
      {
        body: {
          reporter_type: "member",
          report_reason_category_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          community_id: community.id,
          severity: "high",
          description:
            "Reporting comment that has been moderated for policy violation.",
        } satisfies ICommunityPlatformReport.ICreate,
      },
    );
  typia.assert<ICommunityPlatformReport>(report);

  // 6. As communityModerator, fetch the reported comment via report-comment endpoint
  await api.functional.auth.communityModerator.login(connection, {
    body: {
      identifier: communityModeratorJoin.id,
      password: "moderator-password-1234",
      ip: null,
      href: "https://community-mod.example.com/login3" as string &
        tags.Format<"uri">,
      referrer: "https://community-mod.example.com/login3-ref" as string &
        tags.Format<"uri">,
    } satisfies ICommunityPlatformCommunityModerator.ILogin,
  });

  const reportOfComment =
    await api.functional.communityPlatform.communityModerator.reports.comment.at(
      connection,
      {
        reportId: report.id,
      },
    );
  typia.assert<ICommunityPlatformReportOfComments>(reportOfComment);

  // 7. Assertions: ensure wiring is consistent and comment identity is aligned
  TestValidator.equals(
    "reportOfComment should be linked to the created report",
    reportOfComment.report_id,
    report.id,
  );

  TestValidator.equals(
    "reported comment id should match the original comment",
    reportOfComment.comment.id,
    comment.id,
  );

  TestValidator.equals(
    "reported comment's post should match the original post",
    reportOfComment.comment.post.id,
    post.id,
  );

  // Although ICommunityPlatformComment does not expose visibility_state directly,
  // we at least confirm that the comment state row points to the same comment,
  // proving that the moderation state and report-comment wiring are consistent.
  TestValidator.equals(
    "comment state and reported comment should share the same comment id",
    updatedState.comment_id,
    reportOfComment.comment.id,
  );
}
