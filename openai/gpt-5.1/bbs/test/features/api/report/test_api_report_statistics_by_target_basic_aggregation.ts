import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardReportStatisticsByTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTarget";
import type { IDiscussionBoardReportStatisticsByTargetBucket } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReportStatisticsByTargetBucket";

export async function test_api_report_statistics_by_target_basic_aggregation(
  connection: api.IConnection,
) {
  // 1. Register admin user and establish admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 3 }),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create an article category as admin
  const categoryCreateBody = {
    code: `CAT_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IDiscussionBoardArticleCategory.ICreate;

  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.adminUser.articleCategories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);

  // 3. Register member user and establish member context
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    bio: null,
    location: null,
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/home",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 4. Member creates an article using the category
  const articleCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 3,
      wordMax: 8,
    }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    categoryId: category.id,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.memberUser.articles.create(
      connection,
      {
        body: articleCreateBody,
      },
    );
  typia.assert(article);

  // 5. Member creates a comment on the article
  const commentCreateBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.memberUser.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: commentCreateBody,
      },
    );
  typia.assert(comment);

  // 6. Member creates an attachment on the article
  const attachmentCreateBody = {
    file_uri:
      "https://cdn.example.com/files/" + RandomGenerator.alphaNumeric(16),
    file_name: `file_${RandomGenerator.alphaNumeric(8)}.txt`,
    content_type: "text/plain",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    order_in_article: typia.random<number & tags.Type<"int32">>(),
    status: "active",
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.memberUser.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(attachment);

  // 7. Member creates a report targeting the article specifically
  const reportCreateBodyArticle = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: article.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForArticle: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBodyArticle,
    });
  typia.assert(reportForArticle);

  // 8. Optionally, member could create more reports targeting other objects
  const reportCreateBodyComment = {
    category: "off_topic",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_comment_id: comment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForComment: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBodyComment,
    });
  typia.assert(reportForComment);

  const reportCreateBodyAttachment = {
    category: "dangerous_misleading",
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    target_attachment_id: attachment.id,
  } satisfies IDiscussionBoardReport.ICreate;

  const reportForAttachment: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBodyAttachment,
    });
  typia.assert(reportForAttachment);

  // 9. Switch back to admin context by logging in as the admin user
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/dashboard",
    referrer: "https://admin.example.com/login",
  } satisfies IDiscussionBoardAdminUserLogin.IRequest;

  const adminLoggedIn: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 10. Call statistics-by-target endpoint with minimal filter (no filters)
  const statisticsRequestBody = {
    // no filters: include all reports
  } satisfies IDiscussionBoardReportStatisticsByTarget.IRequest;

  const statistics: IDiscussionBoardReportStatisticsByTarget =
    await api.functional.discussionBoard.adminUser.reports.statistics.byTarget.index(
      connection,
      {
        body: statisticsRequestBody,
      },
    );
  typia.assert(statistics);

  // 11. Validate buckets and aggregation correctness
  const buckets = statistics.buckets;

  // Ensure at least the three target types we created
  TestValidator.predicate(
    "buckets should not be empty when reports exist",
    buckets.length > 0,
  );

  const findBucket = (
    targetType: string,
  ): IDiscussionBoardReportStatisticsByTargetBucket | undefined =>
    buckets.find((b) => b.targetType === targetType);

  const articleBucket = findBucket("article");
  const commentBucket = findBucket("comment");
  const attachmentBucket = findBucket("attachment");

  TestValidator.predicate(
    "article bucket should exist after article report",
    articleBucket !== undefined,
  );
  TestValidator.predicate(
    "comment bucket should exist after comment report",
    commentBucket !== undefined,
  );
  TestValidator.predicate(
    "attachment bucket should exist after attachment report",
    attachmentBucket !== undefined,
  );

  const assertBucketConsistency = (
    title: string,
    bucket: IDiscussionBoardReportStatisticsByTargetBucket,
  ) => {
    TestValidator.predicate(
      `${title} totalReportCount must be >= 1`,
      bucket.totalReportCount >= 1,
    );
    TestValidator.equals(
      `${title} open + resolved equals total`,
      bucket.totalReportCount,
      bucket.openReportCount + bucket.resolvedReportCount,
    );
  };

  if (articleBucket !== undefined) {
    assertBucketConsistency("article bucket", articleBucket);
  }
  if (commentBucket !== undefined) {
    assertBucketConsistency("comment bucket", commentBucket);
  }
  if (attachmentBucket !== undefined) {
    assertBucketConsistency("attachment bucket", attachmentBucket);
  }

  // Additionally, verify this invariant for all buckets globally
  for (const bucket of buckets) {
    TestValidator.equals(
      "each bucket open + resolved equals total",
      bucket.totalReportCount,
      bucket.openReportCount + bucket.resolvedReportCount,
    );
  }
}
