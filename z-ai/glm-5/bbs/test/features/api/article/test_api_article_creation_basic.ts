import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
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
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test article creation by a member in the discussion board.
 * Validates complete article creation workflow with proper author attribution,
 * section assignment, and response structure validation.
 */
export async function test_api_article_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create section for article
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 2. Member setup - will be the article author
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  // 3. Create article with whitespace in title (to test trimming)
  const articleTitle = `  ${RandomGenerator.paragraph({ sentences: 2 })}  `;
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: articleTitle,
        content: articleContent,
        section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 4. Validate article entity
  // Author attribution from authenticated member
  TestValidator.equals(
    "author id matches member",
    article.author.id,
    memberAuth.id,
  );
  // Title trimming validation
  const trimmedTitle = articleTitle.trim();
  TestValidator.equals("title is trimmed", article.title, trimmedTitle);
  // Section reference validation
  TestValidator.equals("section id matches", article.section.id, section.id);
  TestValidator.equals(
    "section name matches",
    article.section.name,
    section.name,
  );
  // Initial state validation
  TestValidator.equals("tags array is empty", article.tags.length, 0);
  TestValidator.equals(
    "attachments array is empty",
    article.attachments.length,
    0,
  );
  TestValidator.equals("comments_count is zero", article.comments_count, 0);
  // Timestamps validation - created_at equals updated_at on creation
  TestValidator.equals(
    "created_at equals updated_at",
    article.created_at,
    article.updated_at,
  );
  // Author summary structure validation
  TestValidator.predicate(
    "author has displayName",
    article.author.displayName.length > 0,
  );
  TestValidator.equals("author banned status", article.author.banned, false);
  // Section summary structure validation
  TestValidator.predicate("section has name", article.section.name.length > 0);
  TestValidator.predicate(
    "section has description",
    article.section.description.length > 0,
  );
}
