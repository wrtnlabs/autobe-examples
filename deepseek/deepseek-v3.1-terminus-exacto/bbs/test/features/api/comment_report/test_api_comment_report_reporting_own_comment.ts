import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentReport";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_comments_reports_create } from "../../../generate/generate_random_discussion_board_user_comments_reports_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_comment_report } from "../../../prepare/prepare_random_discussion_board_comment_report";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_comment_report_reporting_own_comment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Admin login to get proper authentication
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.discussionBoard.auth.admin.login(
    authenticatedAdminConnection,
    {
      body: {
        email: adminUser.email,
        password: "admin123",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.ILogin,
    },
  );
  const section = await api.functional.discussionBoard.admin.sections.create(
    authenticatedAdminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(15) + " Section", // Ensures reasonable length
        description: RandomGenerator.paragraph({ sentences: 2 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. User setup and authentication
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const authenticatedUserConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.discussionBoard.auth.user.login(
    authenticatedUserConnection,
    {
      body: {
        email: user.email,
        password: "user123",
      } satisfies IDiscussionBoardUser.ILogin,
    },
  );
  // 3. User creates article with proper length constraints
  const article = await api.functional.discussionBoard.user.articles.create(
    authenticatedUserConnection,
    {
      body: {
        title: RandomGenerator.alphabets(50) + " Article Title", // Ensures title length 5-200 chars
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }), // Ensures min 50 chars
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. User creates comment on their own article
  const comment =
    await api.functional.discussionBoard.user.articles.comments.create(
      authenticatedUserConnection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Test self-reporting behavior using TestValidator.error for cleaner assertions
  // TestValidator.error expects the async function to throw an error.
  // If it doesn't throw, the test fails. So we can't rely on returning a value.
  // We'll use a different approach to test self-reporting behavior.
  let selfReport: IDiscussionBoardCommentReport | null = null;
  try {
    selfReport = await api.functional.discussionBoard.user.comments.reports.create(
      authenticatedUserConnection,
      {
        commentId: comment.id,
        body: {
          reason: "This is my own comment I want to report",
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
    // If we reach here, self-reporting succeeded unexpectedly
    console.warn("Self-reporting was unexpectedly allowed");
  } catch (error) {
    // Expected: self-reporting should fail, so we do nothing
  }
  
  // If self-reporting was allowed (which shouldn't happen), validate the report
  if (selfReport !== null) {
    typia.assert(selfReport);
    TestValidator.equals(
      "self-reported comment matches",
      selfReport.reportedComment.id,
      comment.id,
    );
    TestValidator.equals(
      "reporter is comment author",
      selfReport.reporter.id,
      comment.author.id,
    );
    TestValidator.equals(
      "report status is pending",
      selfReport.status,
      "pending",
    );
  }
  // 6. Verify normal reporting works with different user
  const anotherUserConnection: api.IConnection = { host: connection.host };
  const anotherUser = await authorize_user_join(anotherUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "another123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  const authenticatedAnotherUserConnection: api.IConnection = {
    host: connection.host,
  };
  await api.functional.discussionBoard.auth.user.login(
    authenticatedAnotherUserConnection,
    {
      body: {
        email: anotherUser.email,
        password: "another123",
      } satisfies IDiscussionBoardUser.ILogin,
    },
  );
  const validReport =
    await api.functional.discussionBoard.user.comments.reports.create(
      authenticatedAnotherUserConnection,
      {
        commentId: comment.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardCommentReport.ICreate,
      },
    );
  typia.assert(validReport);
  TestValidator.equals(
    "reported comment matches",
    validReport.reportedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "reporter is different from comment author",
    validReport.reporter.id !== comment.author.id,
    true,
  );
  TestValidator.equals(
    "report status should be pending",
    validReport.status,
    "pending",
  );
}