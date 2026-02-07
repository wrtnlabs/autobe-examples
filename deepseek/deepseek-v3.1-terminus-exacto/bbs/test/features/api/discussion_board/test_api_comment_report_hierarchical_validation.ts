import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_reports_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";

/**
 * Test hierarchical validation of comment report retrieval endpoint.
 * Create two separate article-comment-report hierarchies to test that
 * the endpoint correctly validates the hierarchical relationships.
 * Verify that retrieving a report with mismatched article-comment-report
 * relationships fails with appropriate error handling.
 */
export async function test_api_comment_report_hierarchical_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first user connection
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUserAuth = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create first article
  const firstArticle =
    await generate_random_discussion_board_user_articles_create(
      firstUserConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(firstArticle);
  // Create first comment on first article
  const firstComment =
    await generate_random_discussion_board_user_articles_comments_create(
      firstUserConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: firstArticle.id,
        },
      },
    );
  typia.assert(firstComment);
  // Create report for first comment
  const firstReport =
    await generate_random_discussion_board_user_articles_comments_reports_create(
      firstUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
        params: {
          articleId: firstArticle.id,
          commentId: firstComment.id,
        },
      },
    );
  typia.assert(firstReport);
  // Create second user connection
  const secondUserConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(secondUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Create second article
  const secondArticle =
    await generate_random_discussion_board_user_articles_create(
      secondUserConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          section_id: typia.random<string & tags.Format<"uuid">>(),
          status: "published" as const,
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(secondArticle);
  // Create second comment on second article
  const secondComment =
    await generate_random_discussion_board_user_articles_comments_create(
      secondUserConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: secondArticle.id,
        },
      },
    );
  typia.assert(secondComment);
  // Create report for second comment
  const secondReport =
    await generate_random_discussion_board_user_articles_comments_reports_create(
      secondUserConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
        params: {
          articleId: secondArticle.id,
          commentId: secondComment.id,
        },
      },
    );
  typia.assert(secondReport);
  // Test valid hierarchical retrieval - first hierarchy
  const retrievedFirstReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.at(
      superAdminConnection,
      {
        articleId: firstArticle.id,
        commentId: firstComment.id,
        reportId: firstReport.id,
      },
    );
  typia.assert(retrievedFirstReport);
  TestValidator.equals(
    "first report matches",
    retrievedFirstReport.id,
    firstReport.id,
  );
  // Test valid hierarchical retrieval - second hierarchy
  const retrievedSecondReport =
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.at(
      superAdminConnection,
      {
        articleId: secondArticle.id,
        commentId: secondComment.id,
        reportId: secondReport.id,
      },
    );
  typia.assert(retrievedSecondReport);
  TestValidator.equals(
    "second report matches",
    retrievedSecondReport.id,
    secondReport.id,
  );
  // Test hierarchical validation failure - mismatched article
  await TestValidator.error("mismatched article should fail", async () => {
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.at(
      superAdminConnection,
      {
        articleId: secondArticle.id, // Wrong article
        commentId: firstComment.id, // Comment from first article
        reportId: firstReport.id, // Report from first comment
      },
    );
  });
  // Test hierarchical validation failure - mismatched comment
  await TestValidator.error("mismatched comment should fail", async () => {
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.at(
      superAdminConnection,
      {
        articleId: firstArticle.id, // Correct article
        commentId: secondComment.id, // Wrong comment (from different article)
        reportId: firstReport.id, // Report from first comment
      },
    );
  });
  // Test hierarchical validation failure - mismatched report
  await TestValidator.error("mismatched report should fail", async () => {
    await api.functional.discussionBoard.superAdmin.articles.comments.reports.at(
      superAdminConnection,
      {
        articleId: firstArticle.id, // Correct article
        commentId: firstComment.id, // Correct comment
        reportId: secondReport.id, // Wrong report (from different comment)
      },
    );
  });
}
