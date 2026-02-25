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
import { generate_random_discussion_board_admin_articles_tags_create } from "../../../generate/generate_random_discussion_board_admin_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create an article using utility function
  const article = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {},
  );
  typia.assert(article);
  // Create initial tag association using utility function
  const initialTagBody = {
    tag_name: RandomGenerator.alphabets(10),
  } satisfies DeepPartial<IDiscussionBoardArticleTag.ICreate>;
  const initialTag =
    await generate_random_discussion_board_admin_articles_tags_create(
      adminConnection,
      {
        body: initialTagBody,
        params: { articleId: article.id },
      },
    );
  typia.assert(initialTag);
  // Update the tag name with new valid value
  const newTagName = RandomGenerator.alphabets(15);
  const updatedTag =
    await api.functional.discussionBoard.admin.articles.tags.update(
      adminConnection,
      {
        articleId: article.id,
        tagId: initialTag.id,
        body: {
          tag_name: newTagName,
        } satisfies IDiscussionBoardArticleTag.IUpdate,
      },
    );
  typia.assert(updatedTag);
  // Validate the update was successful
  TestValidator.equals("tag name updated", updatedTag.tag_name, newTagName);
  TestValidator.equals(
    "article ID unchanged",
    updatedTag.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals("tag ID unchanged", updatedTag.id, initialTag.id);
  TestValidator.equals(
    "created at unchanged",
    updatedTag.created_at,
    initialTag.created_at,
  );
  TestValidator.notEquals(
    "updated at changed",
    updatedTag.updated_at,
    initialTag.updated_at,
  );
  TestValidator.predicate(
    "updated at is valid date",
    !isNaN(new Date(updatedTag.updated_at).getTime()),
  );
  TestValidator.equals("deleted at is null", updatedTag.deleted_at, null);
}
