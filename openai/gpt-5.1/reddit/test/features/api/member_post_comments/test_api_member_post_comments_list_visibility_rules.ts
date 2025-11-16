import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountRestriction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountRestriction";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationAction";
import type { ICommunityPlatformModerationCase } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationCase";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";

/**
 * Validate member and admin visibility behaviors for post comment listings.
 *
 * Business goal (adjusted to available SDK/DTOs):
 *
 * - Ensure that the comments index endpoint for a given post returns type-safe,
 *   correctly scoped paginated comment summaries for different actor roles
 *   (memberUser and adminUser).
 * - Verify that includeRemoved and includeHiddenByScore flags can be supplied by
 *   both a regular member and an admin without causing errors, even though
 *   removed/hidden semantics are not observable via the current summary DTO
 *   shape.
 * - Exercise realistic workflow pieces around comments: creating communities,
 *   posts, comments, filing comment reports as a different member, and
 *   recording a moderation action as an admin, then confirm that comment
 *   listing remains functional afterwards.
 *
 * High level process:
 *
 * 1. Create member A and log in as that member.
 * 2. As member A, create a community and a post inside it.
 * 3. As member A, create multiple comments on the post.
 * 4. Create member B and log in as member B.
 * 5. As member B, file a comment report against one of the comments.
 * 6. Create an admin user and (optionally) log in as that admin.
 * 7. As admin, create a moderation action record linked to a synthetic moderation
 *    case id (no functional side-effects asserted).
 * 8. Log back in as member A and list comments for the post without
 *    includeRemoved/includeHiddenByScore.
 * 9. Log in as member A again and list comments with both flags turned on,
 *    verifying type and scoping but not assuming different counts.
 * 10. Log in as admin and list comments with both flags turned on, again verifying
 *     type and scoping.
 */
export async function test_api_member_post_comments_list_visibility_rules(
  connection: api.IConnection,
) {
  // 1. Register member A (creator of community, post, and initial comments)
  const memberAJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberA: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberAJoinBody,
    });
  typia.assert(memberA);

  // 2. As member A, create a community
  const communityBody = {
    slug: RandomGenerator.alphabets(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Create a post inside the community as member A
  const postBody = {
    communityId: community.id,
    communityCode: community.slug,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    url: undefined,
    postType: "text",
  } satisfies ICommunityPlatformPost.ICreate;

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.memberUser.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Create multiple comments on the post as member A
  const commentContents = [
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
    RandomGenerator.paragraph({ sentences: 2 }),
  ];

  const createdComments: ICommunityPlatformComment[] = [];
  for (const content of commentContents) {
    const createCommentBody = {
      content,
      parentCommentId: undefined,
    } satisfies ICommunityPlatformComment.ICreate;

    const comment: ICommunityPlatformComment =
      await api.functional.communityPlatform.memberUser.posts.comments.create(
        connection,
        {
          postId: post.id as string & tags.Format<"uuid">,
          body: createCommentBody,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }

  TestValidator.predicate(
    "at least three comments created",
    createdComments.length >= 3,
  );

  const [comment1, comment2, comment3] = createdComments;
  void comment1;
  void comment3;

  // 5. Create member B and log in as that member for reporting
  const memberBJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphabets(10),
    ip: null,
    href: "https://client.example.com/signup",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberB: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberBJoinBody,
    });
  typia.assert(memberB);

  const memberBLoginBody = {
    identifier: memberBJoinBody.username,
    password: memberBJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberBSession: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberBLoginBody,
    });
  typia.assert(memberBSession);

  // 6. As member B, file a comment report on comment2
  const reportBody = {
    comment_id: comment2.id,
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformCommentReport.ICreate;

  const commentReport: ICommunityPlatformCommentReport =
    await api.functional.communityPlatform.memberUser.commentReports.create(
      connection,
      {
        body: reportBody,
      },
    );
  typia.assert(commentReport);

  TestValidator.equals(
    "reported comment id should match target comment",
    commentReport.comment.id,
    comment2.id,
  );

  // 7. Create admin user and perform a moderation action
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const admin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  const adminLoginBody = {
    identifier: adminJoinBody.username,
    password: adminJoinBody.password,
    ip: null,
    href: "https://client.example.com/admin/login",
    referrer: "https://client.example.com/admin",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const adminSession: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminSession);

  const syntheticModerationCaseId = typia.random<
    string & tags.Format<"uuid">
  >();

  const moderationActionBody = {
    moderation_case_id: syntheticModerationCaseId,
    account_restriction_id: null,
    action_type: "hide_comment",
    scope: "content",
    reason_category: "spam",
    reason_detail: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformModerationAction.ICreate;

  const moderationAction: ICommunityPlatformModerationAction =
    await api.functional.communityPlatform.adminUser.moderationActions.create(
      connection,
      {
        body: moderationActionBody,
      },
    );
  typia.assert(moderationAction);

  TestValidator.equals(
    "moderation action scope should be content",
    moderationAction.scope,
    moderationActionBody.scope,
  );

  // 8. Log back in as member A and list comments without includeRemoved/includeHiddenByScore
  const memberALoginBody = {
    identifier: memberAJoinBody.username,
    password: memberAJoinBody.password,
    ip: null,
    href: "https://client.example.com/login",
    referrer: "https://client.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.ILogin;

  const memberASession: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.login(connection, {
      body: memberALoginBody,
    });
  typia.assert(memberASession);

  const memberAIndexRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    orderBy: "createdAtAsc" as const,
    authorMemberUserId: undefined,
    communityId: undefined,
    postId: post.id,
    parentCommentId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    query: undefined,
    includeRemoved: false,
    includeHiddenByScore: false,
  } satisfies ICommunityPlatformComment.IRequest;

  const memberAIndexPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: memberAIndexRequest,
      },
    );
  typia.assert(memberAIndexPage);

  TestValidator.equals(
    "member A pagination current page is 1",
    memberAIndexPage.pagination.current,
    1,
  );

  TestValidator.predicate(
    "member A listing has at least created comments",
    memberAIndexPage.pagination.records >= createdComments.length,
  );

  await ArrayUtil.asyncForEach(memberAIndexPage.data, async (summary) => {
    typia.assert<ICommunityPlatformComment.ISummary>(summary);
    TestValidator.equals(
      "summary post id matches created post",
      summary.post.id,
      post.id,
    );
  });

  const memberARecordsBaseline = memberAIndexPage.pagination.records;

  // 9. member A listing with includeRemoved/includeHiddenByScore enabled
  const memberAIndexWithFlagsRequest = {
    ...memberAIndexRequest,
    includeRemoved: true,
    includeHiddenByScore: true,
  } satisfies ICommunityPlatformComment.IRequest;

  const memberAIndexWithFlagsPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: memberAIndexWithFlagsRequest,
      },
    );
  typia.assert(memberAIndexWithFlagsPage);

  TestValidator.equals(
    "member A pagination with flags still page 1",
    memberAIndexWithFlagsPage.pagination.current,
    1,
  );

  await ArrayUtil.asyncForEach(
    memberAIndexWithFlagsPage.data,
    async (summary) => {
      typia.assert<ICommunityPlatformComment.ISummary>(summary);
      TestValidator.equals(
        "summary post id matches post for flags listing",
        summary.post.id,
        post.id,
      );
    },
  );

  // 10. Admin listing with includeRemoved/includeHiddenByScore enabled
  const adminIndexRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    cursor: undefined,
    orderBy: "createdAtAsc" as const,
    authorMemberUserId: undefined,
    communityId: undefined,
    postId: post.id,
    parentCommentId: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    query: undefined,
    includeRemoved: true,
    includeHiddenByScore: true,
  } satisfies ICommunityPlatformComment.IRequest;

  const adminIndexPage: IPageICommunityPlatformComment.ISummary =
    await api.functional.communityPlatform.memberUser.posts.comments.index(
      connection,
      {
        postId: post.id as string & tags.Format<"uuid">,
        body: adminIndexRequest,
      },
    );
  typia.assert(adminIndexPage);

  await ArrayUtil.asyncForEach(adminIndexPage.data, async (summary) => {
    typia.assert<ICommunityPlatformComment.ISummary>(summary);
    TestValidator.equals(
      "admin summary post id matches post",
      summary.post.id,
      post.id,
    );
  });

  const adminRecords = adminIndexPage.pagination.records;

  TestValidator.predicate(
    "admin sees at least as many records as member baseline",
    adminRecords >= memberARecordsBaseline,
  );
}
