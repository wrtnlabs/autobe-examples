import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_tag_retrieval_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  // 2. Create prerequisite article using SDK directly (no generation function available)
  const article = await api.functional.discussionBoard.admin.articles.create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Tag creation must happen through separate endpoint (not implemented in scenario)
  // Since tag creation is not part of the provided API functions, we'll need to assume
  // a tag already exists and test retrieval of a specific existing tag
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve specific tag association
  const tag = await api.functional.discussionBoard.admin.articles.tags.at(
    adminConnection,
    {
      articleId: article.id,
      tagId: tagId,
    },
  );
  typia.assert(tag);
  // 5. Validate response contains complete tag association record
  TestValidator.equals("tag ID matches", tag.id, tagId);
  TestValidator.equals("tag name exists", typeof tag.tag_name, "string");
  TestValidator.equals(
    "article ID matches",
    tag.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate("created_at is valid date", tag.created_at !== null);
  TestValidator.predicate("updated_at is valid date", tag.updated_at !== null);
  // 6. Verify article relationship structure
  TestValidator.equals(
    "article ID in relationship",
    tag.article.id,
    article.id,
  );
  TestValidator.equals(
    "article title in relationship",
    tag.article.title,
    article.title,
  );
  TestValidator.equals(
    "article status in relationship",
    tag.article.status,
    article.status,
  );
  TestValidator.predicate(
    "article created_at is valid date",
    tag.article.created_at !== null,
  );
  // 7. Validate foreign key relationships and data integrity
  TestValidator.equals(
    "author ID matches",
    tag.article.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "author display name matches",
    tag.article.author.display_name,
    article.author.display_name,
  );
  TestValidator.equals(
    "section ID matches",
    tag.article.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "section name matches",
    tag.article.section.name,
    article.section.name,
  );
}
