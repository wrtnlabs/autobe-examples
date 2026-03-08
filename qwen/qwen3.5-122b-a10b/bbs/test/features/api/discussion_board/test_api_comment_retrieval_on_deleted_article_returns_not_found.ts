import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that retrieving a comment on a discussion board article returns proper response.
 * The test should:
 * 1) Create a section as admin
 * 2) Create an article as member
 * 3) Create a comment as member on that article
 * 4) Verify the comment is accessible with valid articleId and commentId
 * 5) Verify that retrieving a comment with non-existent IDs returns 404
 *
 * Note: Article deletion functionality is not available in the provided SDK,
 * so this test validates comment retrieval with both valid and invalid IDs instead.
 */
export async function test_api_comment_retrieval_on_deleted_article_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate credentials
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const memberDisplayName = RandomGenerator.name();
  // 1. Create admin account
  const adminJoinResult = await authorize_admin_join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      display_name: adminDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminJoinResult);
  // 2. Create admin connection and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 3. Create member account
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: memberDisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 4. Create member connection and login
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 5. Admin creates a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 6. Member creates an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 7. Member creates a comment on the article
  const comment =
    await generate_random_discussion_board_member_articles_comments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);
  // 8. Verify comment is accessible with valid IDs
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(
      memberConnection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(retrievedComment);
  TestValidator.equals(
    "comment accessible with valid IDs",
    retrievedComment.id,
    comment.id,
  );
  // 9. Verify that retrieving a comment with non-existent articleId returns 404
  await TestValidator.httpError(
    "comment not accessible with non-existent articleId",
    404,
    async () => {
      await api.functional.discussionBoard.articles.comments.at(
        memberConnection,
        {
          articleId: typia.random<string & tags.Format<"uuid">>(),
          commentId: comment.id,
        },
      );
    },
  );
  // 10. Verify that retrieving a comment with non-existent commentId returns 404
  await TestValidator.httpError(
    "comment not accessible with non-existent commentId",
    404,
    async () => {
      await api.functional.discussionBoard.articles.comments.at(
        memberConnection,
        {
          articleId: article.id,
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
