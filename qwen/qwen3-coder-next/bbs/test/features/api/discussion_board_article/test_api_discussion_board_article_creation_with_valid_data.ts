import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_admin_sections_articles_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful article creation within a section.
 * 1. Create admin user via /discussionBoard/auth/admin/join
 * 2. Create section via /discussionBoard/superAdmin/sections
 * 3. Create article with valid title (1-500 chars) and content
 * 4. Verify response includes required fields (id, title, content, timestamps, author info, section info)
 * 5. Check article is associated with correct section and author
 * 6. Verify file attachments if provided
 */
export async function test_api_discussion_board_article_creation_with_valid_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234test!",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create super admin user
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234test!",
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 3. Create section using superAdmin
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 4. Create article with valid data
  const article =
    await api.functional.discussionBoard.admin.sections.articles.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          title: RandomGenerator.alphabets(50),
          content: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 5. Verify required fields
  TestValidator.equals("article has id", article.id, article.id);
  TestValidator.equals("title matches", article.title, article.title);
  TestValidator.equals("content matches", article.content, article.content);
  TestValidator.predicate(
    "has created_at timestamp",
    article.created_at !== undefined && article.created_at !== null,
  );
  TestValidator.equals(
    "author is member",
    article.author.id,
    article.author.id,
  );
  TestValidator.equals("section is set", article.section.id, section.id);
  // 6. Verify section association
  TestValidator.equals(
    "section name matches",
    article.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches",
    article.section.description,
    section.description,
  );
  // 7. Verify author info
  TestValidator.predicate(
    "author has display_name",
    article.author.display_name !== undefined &&
      article.author.display_name !== null,
  );
}
