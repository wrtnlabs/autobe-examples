import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create member who will create and update the article
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      passwordConfirmation: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Generate a section ID for the article (using a random UUID as we don't have section creation utility)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create article as the member
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: sectionId,
        tags: [RandomGenerator.name(1), RandomGenerator.name(1)],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Update the article with new title and content
  const updatedArticle =
    await api.functional.discussionBoard.admin.articles.update(
      memberConnection,
      {
        articleId: article.id,
        body: {
          title: RandomGenerator.name(4),
          content: RandomGenerator.content({ paragraphs: 5 }),
          section_id: sectionId,
          tags: [RandomGenerator.name(1)],
        } satisfies IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // Verify updated article data
  TestValidator.notEquals("title changed", updatedArticle.title, article.title);
  TestValidator.notEquals(
    "content changed",
    updatedArticle.content,
    article.content,
  );
  TestValidator.equals("article ID preserved", updatedArticle.id, article.id);
  TestValidator.equals(
    "author preserved",
    updatedArticle.author.id,
    article.author.id,
  );
  TestValidator.equals(
    "section preserved",
    updatedArticle.section.id,
    article.section.id,
  );
}
