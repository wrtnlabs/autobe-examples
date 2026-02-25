import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_articles_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_superadmin_article_update_with_section_change(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Step 2: Create initial article
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 3,
            wordMax: 7,
          }) satisfies string &
            tags.MinLength<5> &
            tags.MaxLength<200> as string &
            tags.MinLength<5> &
            tags.MaxLength<200>,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 8,
            wordMin: 3,
            wordMax: 7,
          }) satisfies string & tags.MinLength<50> as string &
            tags.MinLength<50>,
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // Step 3: Prepare new section ID for reassignment
  const newSectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 4: Update article with new section assignment
  const updatedArticle =
    await api.functional.discussionBoard.superAdmin.articles.update(
      superAdminConnection,
      {
        articleId: article.id,
        body: {
          discussion_board_section_id: newSectionId,
        } as IDiscussionBoardArticle.IUpdate,
      },
    );
  typia.assert(updatedArticle);
  // Step 5: Validate section reassignment
  TestValidator.equals(
    "section ID updated",
    updatedArticle.section.id,
    newSectionId,
  );
  TestValidator.equals("title unchanged", updatedArticle.title, article.title);
  TestValidator.equals(
    "content unchanged",
    updatedArticle.content,
    article.content,
  );
  TestValidator.equals(
    "author unchanged",
    updatedArticle.author.id,
    article.author.id,
  );
}
