import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_article_viewing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create section using admin connection
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create author member connection and authenticate
  const authorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 4. Create article using author connection
  const article = await generate_random_discussion_board_member_articles_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Create second member for commenting
  const commenterConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(commenterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 6. Add first comment
  const firstComment =
    await generate_random_discussion_board_member_articles_comments_create(
      commenterConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(firstComment);
  // 7. Add second comment
  const secondComment =
    await generate_random_discussion_board_member_articles_comments_create(
      commenterConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article.id },
      },
    );
  typia.assert(secondComment);
  // 8. Retrieve article with full details using member connection
  const retrievedArticle = await api.functional.discussionBoard.articles.at(
    authorConnection,
    { articleId: article.id },
  );
  typia.assert(retrievedArticle);
  // 9. Validate article details
  TestValidator.equals(
    "article title matches",
    retrievedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article body matches",
    retrievedArticle.body,
    article.body,
  );
  TestValidator.equals(
    "article section matches",
    retrievedArticle.section.id,
    section.id,
  );
  TestValidator.equals(
    "article author matches",
    retrievedArticle.author.id,
    article.author.id,
  );
  // 10. Validate author information
  TestValidator.predicate(
    "author has display name",
    retrievedArticle.author.display_name.length > 0,
  );
  TestValidator.predicate(
    "author bio is present",
    retrievedArticle.author.bio !== null,
  );
  // 11. Validate section information
  TestValidator.equals(
    "section name matches",
    retrievedArticle.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description matches",
    retrievedArticle.section.description,
    section.description,
  );
  // 12. Validate timestamps
  TestValidator.predicate(
    "created_at is valid ISO date",
    new Date(retrievedArticle.created_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    new Date(retrievedArticle.updated_at).toString() !== "Invalid Date",
  );
  TestValidator.equals("deleted_at is null", retrievedArticle.deleted_at, null);
  // 13. Validate article status exists
  TestValidator.predicate(
    "article status is defined",
    retrievedArticle.status.length > 0,
  );
}
