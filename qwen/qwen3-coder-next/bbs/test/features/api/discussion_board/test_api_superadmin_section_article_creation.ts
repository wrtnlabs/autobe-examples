import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_superadmin_section_article_creation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Fetch existing sections to get a valid section ID
  const sections = await api.functional.discussionBoard.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      },
    },
  );
  typia.assert(sections);
  TestValidator.predicate("has at least one section", sections.data.length > 0);
  const sectionId = sections.data[0].id;
  // 3. Create an article in the section
  const title = RandomGenerator.paragraph({ sentences: 1 });
  const content = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 3,
    sentenceMax: 10,
  });
  const article =
    await api.functional.discussionBoard.superAdmin.sections.articles.create(
      adminConnection,
      {
        sectionId: sectionId,
        body: {
          title: title,
          content: content,
        },
      },
    );
  typia.assert(article);
  // 4. Validate response
  TestValidator.equals("title matches input", article.title, title);
  TestValidator.equals("content matches input", article.content, content);
  TestValidator.equals(
    "section matches selected",
    article.section.id,
    sectionId,
  );
  TestValidator.equals("author is super admin", article.author.id, admin.id);
  TestValidator.predicate(
    "has valid created_at timestamp",
    new Date(article.created_at).getTime() > 0,
  );
}
