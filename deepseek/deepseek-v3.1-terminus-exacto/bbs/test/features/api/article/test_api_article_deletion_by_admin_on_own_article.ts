import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_deletion_by_admin_on_own_article(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create article as administrator
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 3,
      sentenceMax: 5,
    }),
    section_id: typia.random<string & tags.Format<"uuid">>(),
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.ICreate;
  const article = await generate_random_discussion_board_user_articles_create(
    adminConnection,
    {
      body: articleBody,
    },
  );
  typia.assert(article);
  // Step 3: Delete the article using admin deletion endpoint
  const deletedArticle =
    await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
      articleId: article.id,
    });
  typia.assert(deletedArticle);
  // Step 4: Validate deletion results
  TestValidator.equals("article ID matches", deletedArticle.id, article.id);
  TestValidator.predicate(
    "deletion timestamp should be set",
    () => deletedArticle.deleted_at !== null,
  );
  TestValidator.equals(
    "title remains unchanged",
    deletedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "content remains unchanged",
    deletedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "author remains the same",
    deletedArticle.author.id,
    admin.id,
  );
}