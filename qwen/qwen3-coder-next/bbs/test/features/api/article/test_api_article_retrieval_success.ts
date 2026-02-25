import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_article_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection-only approach since article retrieval is a public endpoint
  const articleConnection: api.IConnection = { host: connection.host };
  // Use typia.random to generate proper DTO data with correct types
  const article = typia.random<IDiscussionBoardArticle>();
  // Test retrieval with the generated article's ID
  const retrieved = await api.functional.discussionBoard.articles.at(
    articleConnection,
    {
      articleId: article.id,
    },
  );
  // Verify the retrieved article matches the expected schema
  typia.assert(retrieved);
  // Validate core properties match
  TestValidator.equals("article id matches", retrieved.id, article.id);
  TestValidator.equals("title matches", retrieved.title, article.title);
  TestValidator.equals("content matches", retrieved.content, article.content);
  // Validate author structure
  TestValidator.equals(
    "author id matches",
    retrieved.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "author email matches",
    retrieved.author.email,
    article.author.email,
  );
  TestValidator.equals(
    "author display_name matches",
    retrieved.author.display_name,
    article.author.display_name,
  );
  // Validate section structure
  TestValidator.equals(
    "section id matches",
    retrieved.section.id,
    article.section.id,
  );
  TestValidator.equals(
    "section name matches",
    retrieved.section.name,
    article.section.name,
  );
  // Validate numeric fields
  TestValidator.equals(
    "comments_count matches",
    retrieved.comments_count,
    article.comments_count,
  );
  // Validate timestamp fields
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    article.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrieved.updated_at,
    article.updated_at,
  );
  // Validate nullable field (deleted_at)
  if (article.deleted_at !== null) {
    TestValidator.equals(
      "deleted_at matches",
      retrieved.deleted_at,
      article.deleted_at,
    );
  } else {
    TestValidator.equals("deleted_at is null", retrieved.deleted_at, null);
  }
}
