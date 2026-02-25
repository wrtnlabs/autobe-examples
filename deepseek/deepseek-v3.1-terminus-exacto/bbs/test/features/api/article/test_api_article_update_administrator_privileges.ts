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

export async function test_api_article_update_administrator_privileges(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular user account
  const userConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(regularUser);
  // Note: In a real implementation, we would need to create a section first
  // For this test, we'll use a randomly generated section ID since the
  // section creation API is not available in the provided SDK functions
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create article as regular user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
        discussion_board_section_id: sectionId,
      },
    },
  );
  typia.assert(article);
  // 3. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: "http://localhost/admin",
      referrer: "http://localhost",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // 4. Admin updates the regular user's article with privileged changes
  const updateData = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    status: "published" as const,
  } satisfies IDiscussionBoardArticle.IUpdate;
  const updatedArticle =
    await api.functional.discussionBoard.user.articles.update(adminConnection, {
      articleId: article.id,
      body: updateData,
    });
  typia.assert(updatedArticle);
  // 5. Validate the administrator's changes were applied
  TestValidator.equals(
    "article id remains the same",
    updatedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "title was updated by admin",
    updatedArticle.title,
    updateData.title,
  );
  TestValidator.equals(
    "content was updated by admin",
    updatedArticle.content,
    updateData.content,
  );
  TestValidator.equals(
    "status was updated by admin",
    updatedArticle.status,
    updateData.status,
  );
  TestValidator.equals(
    "author remains the same",
    updatedArticle.author.id,
    regularUser.id,
  );
  TestValidator.equals(
    "section remains the same",
    updatedArticle.section.id,
    article.section.id,
  );
  TestValidator.predicate(
    "updated_at should be newer than created_at",
    new Date(updatedArticle.updated_at) > new Date(article.created_at),
  );
}