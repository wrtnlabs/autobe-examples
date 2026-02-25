import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
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
import { generate_random_discussion_board_super_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_deletion_nonexistent_association(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://test.com/join",
      referrer: "http://test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create an article as super admin
  const article =
    await generate_random_discussion_board_super_admin_articles_create(
      superAdminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          discussion_board_section_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Add some valid tags to the article
  const tags: IDiscussionBoardArticleTag[] = [];
  for (let i = 0; i < 3; i++) {
    const tag =
      await generate_random_discussion_board_super_admin_articles_tags_create(
        superAdminConnection,
        {
          body: {
            tag_name: `tag-${i}-${RandomGenerator.alphabets(5)}`,
          } satisfies IDiscussionBoardArticleTag.ICreate,
          params: { articleId: article.id },
        },
      );
    typia.assert(tag);
    tags.push(tag);
  }
  // 4. Record current tag IDs for validation
  const existingTagIds = tags.map((t) => t.id);
  // 5. Generate a non-existent/invalid tag ID and ensure it's unique
  let invalidTagId: string & tags.Format<"uuid">;
  do {
    invalidTagId = typia.random<string & tags.Format<"uuid">>();
  } while (existingTagIds.includes(invalidTagId));
  // 6. Attempt to delete non-existent tag association (should return 404)
  await TestValidator.httpError(
    "should return 404 for non-existent tag association",
    404,
    async () =>
      await api.functional.discussionBoard.superAdmin.articles.tags.erase(
        superAdminConnection,
        {
          articleId: article.id,
          tagId: invalidTagId,
        },
      ),
  );
  // 7. Verify existing tags are still present by attempting to delete one
  // This confirms the tags still exist in the system after the failed deletion attempt
  await api.functional.discussionBoard.superAdmin.articles.tags.erase(
    superAdminConnection,
    {
      articleId: article.id,
      tagId: tags[0].id,
    },
  );
  // 8. Clean up remaining tags (optional)
  for (let i = 1; i < tags.length; i++) {
    await api.functional.discussionBoard.superAdmin.articles.tags.erase(
      superAdminConnection,
      {
        articleId: article.id,
        tagId: tags[i].id,
      },
    );
  }
}
