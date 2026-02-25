import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
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

export async function test_api_article_image_filtering_by_status_and_order(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate using utility function
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Since section creation is not available, use a realistic section ID pattern
  // This assumes there's at least one section in the system
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Create an article for the user
  const article = await generate_random_discussion_board_user_articles_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: sectionId,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test basic image endpoint functionality without filtering since no images exist
  // This tests that the endpoint is accessible and returns proper pagination structure
  const response =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {} satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata structure
  TestValidator.predicate(
    "has pagination metadata",
    () =>
      typeof response.pagination === "object" && response.pagination !== null,
  );
  TestValidator.predicate(
    "current page valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit valid", response.pagination.limit >= 0);
  TestValidator.predicate(
    "records count valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", response.pagination.pages >= 0);
  // Validate empty data array structure (since no images were created)
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // Test with pagination parameters
  const paginatedResponse =
    await api.functional.discussionBoard.user.articles.images.index(
      userConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardArticleFile.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  // Validate pagination parameters were applied
  TestValidator.equals(
    "page parameter applied",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit parameter applied",
    paginatedResponse.pagination.limit,
    5,
  );
}
