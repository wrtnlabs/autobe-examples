import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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
import { prepare_random_discussion_board_article_file } from "../../../prepare/prepare_random_discussion_board_article_file";
import { prepare_random_discussion_board_article_image } from "../../../prepare/prepare_random_discussion_board_article_image";
import { prepare_random_discussion_board_article_tag } from "../../../prepare/prepare_random_discussion_board_article_tag";

export async function test_api_article_tags_add_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user-specific connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {});
  // 2. Create an article with an initial tag
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        tags: ["politics"],
      },
    },
  );
  typia.assert(article);
  // Store initial tag count and the politics tag for later validation
  const politicsTag = article.tags.find((t) => t.value === "politics");
  TestValidator.predicate("politics tag exists", politicsTag !== undefined);
  // 3. Add a tag with uppercase letters - should be normalized to lowercase
  const articleWithEconomics =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: { value: "Economics" },
      },
    );
  typia.assert(articleWithEconomics);
  // Validate: tag normalized to lowercase
  const economicsTag = articleWithEconomics.tags.find(
    (t) => t.value === "economics",
  );
  TestValidator.predicate(
    "economics tag normalized to lowercase",
    economicsTag !== undefined,
  );
  // 4. Add a duplicate tag - should be automatically removed
  const articleWithDuplicate =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: { value: "politics" },
      },
    );
  typia.assert(articleWithDuplicate);
  // Validate: duplicate tag not added again
  const politicsTags = articleWithDuplicate.tags.filter(
    (t) => t.value === "politics",
  );
  TestValidator.equals(
    "duplicate politics tag not re-added",
    politicsTags.length,
    1,
  );
  // 5. Add a new tag with valid format
  const articleWithNewTag =
    await generate_random_discussion_board_user_articles_tags_create(
      userConnection,
      {
        params: { articleId: article.id },
        body: { value: "international-relations" },
      },
    );
  typia.assert(articleWithNewTag);
  // Validate: the new tag exists
  const relationsTag = articleWithNewTag.tags.find(
    (t) => t.value === "international-relations",
  );
  TestValidator.predicate(
    "international-relations tag exists",
    relationsTag !== undefined,
  );
  // 6. Final validation: article author matches authenticated user
  TestValidator.equals(
    "article author matches authenticated user",
    articleWithNewTag.author.id,
    authorizedUser.id,
  );
}
