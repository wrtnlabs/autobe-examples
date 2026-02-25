import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { generate_random_discussion_board_user_articles_tags_create } from "../../../generate/generate_random_discussion_board_user_articles_tags_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tag_creation_successful(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and register user
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // Create an article for the user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {},
  );
  typia.assert(article);
  // Create a tag with mixed-case and whitespace to test normalization
  const rawTagName = "  MixedCaseTag  ";
  const expectedNormalizedTagName = "mixedcasetag";
  const tag = await generate_random_discussion_board_user_articles_tags_create(
    userConnection,
    {
      body: { tag_name: rawTagName },
      params: { articleId: article.id },
    },
  );
  typia.assert(tag);
  // Validate response structure and normalization
  TestValidator.equals(
    "tag name should be normalized",
    tag.tag_name,
    expectedNormalizedTagName,
  );
  TestValidator.equals(
    "article ID should match",
    tag.discussion_board_article_id,
    article.id,
  );
  TestValidator.predicate(
    "created_at should be valid date",
    () => !isNaN(new Date(tag.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at should be valid date",
    () => !isNaN(new Date(tag.updated_at).getTime()),
  );
  TestValidator.predicate("deleted_at should be null", tag.deleted_at === null);
  TestValidator.equals(
    "article summary should match",
    tag.article.id,
    article.id,
  );
}
