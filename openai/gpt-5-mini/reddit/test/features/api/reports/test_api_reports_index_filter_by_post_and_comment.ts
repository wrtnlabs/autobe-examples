import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import type { ICommunityPortalCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalCommunity";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";
import type { ICommunityPortalPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalPost";
import type { ICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPortalReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPortalReport";

export async function test_api_reports_index_filter_by_post_and_comment(
  connection: api.IConnection,
) {
  // 1. Register member (reporter)
  const reporterBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd!",
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const reporter: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: reporterBody,
    });
  typia.assert(reporter);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    // omit slug to let server derive it
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_private: false,
    visibility: "public",
  } satisfies ICommunityPortalCommunity.ICreate;

  const community: ICommunityPortalCommunity =
    await api.functional.communityPortal.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // 3. Create a text post in the community
  const postBody = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
  } satisfies ICommunityPortalPost.ICreate;

  const post: ICommunityPortalPost =
    await api.functional.communityPortal.member.posts.create(connection, {
      body: postBody,
    });
  typia.assert(post);

  // 4. Create a top-level comment on the post
  const commentBody = {
    post_id: post.id,
    parent_comment_id: null,
    body: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
  } satisfies ICommunityPortalComment.ICreate;

  const comment: ICommunityPortalComment =
    await api.functional.communityPortal.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: commentBody,
      },
    );
  typia.assert(comment);

  // 5. File a report against the post
  const postReportBody = {
    reasonCode: "spam",
    reasonText: "Automated test: reporting the post for spam-like content",
    isUrgent: false,
  } satisfies ICommunityPortalReport.ICreate;

  const postReport: ICommunityPortalReport =
    await api.functional.communityPortal.member.posts.reports.create(
      connection,
      {
        postId: post.id,
        body: postReportBody,
      },
    );
  typia.assert(postReport);

  // 6. File a report against the comment
  const commentReportBody = {
    reasonCode: "harassment",
    reasonText: "Automated test: reporting the comment for harassment",
    isUrgent: false,
  } satisfies ICommunityPortalReport.ICreate;

  const commentReport: ICommunityPortalReport =
    await api.functional.communityPortal.member.comments.reports.create(
      connection,
      {
        commentId: comment.id,
        body: commentReportBody,
      },
    );
  typia.assert(commentReport);

  // 7. Query reports filtered by postId
  const listByPostRequest = {
    postId: post.id,
    limit: 10,
    offset: 0,
  } satisfies ICommunityPortalReport.IRequest;

  const pageByPost: IPageICommunityPortalReport.ISummary =
    await api.functional.communityPortal.member.reports.index(connection, {
      body: listByPostRequest,
    });
  typia.assert(pageByPost);

  TestValidator.predicate(
    "reports filtered by postId return only reports referencing that post",
    pageByPost.data.every((r) => r.post_id === post.id),
  );

  TestValidator.predicate(
    "reports by post include at least the created post report",
    pageByPost.data.some((r) => r.id === postReport.id),
  );

  // 8. Query reports filtered by commentId
  const listByCommentRequest = {
    commentId: comment.id,
    limit: 10,
    offset: 0,
  } satisfies ICommunityPortalReport.IRequest;

  const pageByComment: IPageICommunityPortalReport.ISummary =
    await api.functional.communityPortal.member.reports.index(connection, {
      body: listByCommentRequest,
    });
  typia.assert(pageByComment);

  TestValidator.predicate(
    "reports filtered by commentId return only reports referencing that comment",
    pageByComment.data.every((r) => r.comment_id === comment.id),
  );

  TestValidator.predicate(
    "reports by comment include at least the created comment report",
    pageByComment.data.some((r) => r.id === commentReport.id),
  );

  // 9. Validate empty results for non-matching filters
  const randomUuid = typia.random<string & tags.Format<"uuid">>();

  const emptyByPost: IPageICommunityPortalReport.ISummary =
    await api.functional.communityPortal.member.reports.index(connection, {
      body: {
        postId: randomUuid,
        limit: 5,
        offset: 0,
      } satisfies ICommunityPortalReport.IRequest,
    });
  typia.assert(emptyByPost);

  TestValidator.equals(
    "non-matching postId returns empty data array",
    emptyByPost.data,
    [],
  );

  const emptyByComment: IPageICommunityPortalReport.ISummary =
    await api.functional.communityPortal.member.reports.index(connection, {
      body: {
        commentId: randomUuid,
        limit: 5,
        offset: 0,
      } satisfies ICommunityPortalReport.IRequest,
    });
  typia.assert(emptyByComment);

  TestValidator.equals(
    "non-matching commentId returns empty data array",
    emptyByComment.data,
    [],
  );
}
