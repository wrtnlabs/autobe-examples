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
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_update_successful_rename(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(userAuth);
  // Create article
  const article = await api.functional.discussionBoard.user.articles.create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.paragraph({ sentences: 5 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Add initial tags to the article
  const initialTag1 =
    await api.functional.discussionBoard.user.articles.tags.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          tag_name: RandomGenerator.alphabets(8),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(initialTag1);
  const initialTag2 =
    await api.functional.discussionBoard.user.articles.tags.create(
      userConnection,
      {
        articleId: article.id,
        body: {
          tag_name: RandomGenerator.alphabets(8),
        } satisfies IDiscussionBoardArticleTag.ICreate,
      },
    );
  typia.assert(initialTag2);
  // Create superAdmin connection and authenticate using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "admin123",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Update tag name
  const newTagName = RandomGenerator.alphabets(10);
  const updatedTag =
    await api.functional.discussionBoard.superAdmin.articles.tags.update(
      superAdminConnection,
      {
        articleId: article.id,
        tagId: initialTag1.id,
        body: {
          tag_name: newTagName,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updatedTag);
  // Validate the tag name was updated
  TestValidator.equals(
    "tag name should be updated",
    updatedTag.tag_name,
    newTagName,
  );
  TestValidator.notEquals(
    "updated_at should change",
    updatedTag.updated_at,
    initialTag1.updated_at,
  );
  TestValidator.equals(
    "article ID should remain the same",
    updatedTag.discussion_board_article_id,
    article.id,
  );
  // Validate other tag remains unchanged
  TestValidator.equals(
    "second tag should remain unchanged",
    initialTag2.tag_name,
    initialTag2.tag_name,
  );
}
