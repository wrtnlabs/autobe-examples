import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";

export async function test_api_article_images_listing_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate user
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // 2. Create article
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
        section_id: typia.random<string & tags.Format<"uuid">>(),
        status: "published" as const,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Test basic image listing functionality
  const imagesResponse =
    await api.functional.discussionBoard.articles.images.index(connection, {
      articleId: article.id,
      body: {} satisfies IDiscussionBoardArticleImage.IRequest,
    });
  typia.assert(imagesResponse);
  // Validate basic response structure
  TestValidator.predicate(
    "pagination should exist",
    imagesResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data should be an array",
    Array.isArray(imagesResponse.data),
  );
  // Validate pagination metadata structure
  TestValidator.predicate(
    "current page should be non-negative",
    imagesResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit should be non-negative",
    imagesResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    imagesResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    imagesResponse.pagination.pages >= 0,
  );
  // Test with different filter parameters (basic validation without assuming data exists)
  const filterTests: IDiscussionBoardArticleImage.IRequest[] = [
    { status: "active" },
    { display_order_min: 0 },
    { display_order_max: 100 },
    { page: 1, limit: 10 },
    { sort: "display_order_asc" },
  ];
  for (const filter of filterTests) {
    const filteredResponse =
      await api.functional.discussionBoard.articles.images.index(connection, {
        articleId: article.id,
        body: filter,
      });
    typia.assert(filteredResponse);
    // Basic structure validation
    TestValidator.predicate(
      "pagination exists",
      filteredResponse.pagination !== undefined,
    );
    TestValidator.predicate(
      "data is array",
      Array.isArray(filteredResponse.data),
    );
  }
}
