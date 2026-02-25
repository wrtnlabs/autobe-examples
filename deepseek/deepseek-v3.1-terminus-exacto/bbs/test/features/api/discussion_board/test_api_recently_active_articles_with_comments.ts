import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_recently_active_articles_with_comments(
  connection: api.IConnection,
): Promise<void> {
  // Create first user connection
  const user1Connection: api.IConnection = { host: connection.host };
  const user1 = await authorize_user_join(user1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user1);
  // Create second user connection
  const user2Connection: api.IConnection = { host: connection.host };
  const user2 = await authorize_user_join(user2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user2);
  // Create articles with different users
  const article1 = await generate_random_discussion_board_user_articles_create(
    user1Connection,
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
  typia.assert(article1);
  const article2 = await generate_random_discussion_board_user_articles_create(
    user2Connection,
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
  typia.assert(article2);
  const article3 = await generate_random_discussion_board_user_articles_create(
    user1Connection,
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
  typia.assert(article3);
  // Add comments to articles to generate activity
  // Article1 gets multiple recent comments
  const comment1_1 =
    await generate_random_discussion_board_user_articles_comments_create(
      user2Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article1.id },
      },
    );
  typia.assert(comment1_1);
  const comment1_2 =
    await generate_random_discussion_board_user_articles_comments_create(
      user1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article1.id },
      },
    );
  typia.assert(comment1_2);
  // Article2 gets one comment
  const comment2 =
    await generate_random_discussion_board_user_articles_comments_create(
      user1Connection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: { articleId: article2.id },
      },
    );
  typia.assert(comment2);
  // Article3 gets no comments
  // Test recently-active endpoint with pagination
  const recentlyActiveResponse =
    await api.functional.discussionBoard.user.recently_active.recentlyActive(
      user1Connection,
      {
        body: {
          page: 1 satisfies number as number,
          limit: 10 satisfies number as number,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(recentlyActiveResponse);
  // Validate pagination metadata - using correct nested pagination structure
  // Navigate through the nested pagination structure to reach IPage.IPagination
  const actualPagination =
    recentlyActiveResponse.pagination.pagination.pagination.pagination;
  TestValidator.equals("pagination current page", actualPagination.current, 1);
  TestValidator.predicate("pagination limit valid", actualPagination.limit > 0);
  TestValidator.predicate(
    "pagination records valid",
    actualPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages valid",
    actualPagination.pages >= 0,
  );
  // Validate article summary structure
  TestValidator.predicate(
    "has data array",
    Array.isArray(recentlyActiveResponse.data),
  );
  if (recentlyActiveResponse.data.length > 0) {
    const article = recentlyActiveResponse.data[0];
    TestValidator.predicate("article has id", typeof article.id === "string");
    TestValidator.predicate(
      "article has title",
      typeof article.title === "string",
    );
    TestValidator.predicate(
      "article has status",
      typeof article.status === "string",
    );
    TestValidator.predicate(
      "article has created_at",
      typeof article.created_at === "string",
    );
    TestValidator.predicate(
      "article has author",
      typeof article.author === "object",
    );
    TestValidator.predicate(
      "article has section",
      typeof article.section === "object",
    );
    if (article.author) {
      TestValidator.predicate(
        "author has id",
        typeof article.author.id === "string",
      );
      TestValidator.predicate(
        "author has display_name",
        typeof article.author.display_name === "string",
      );
    }
    if (article.section) {
      TestValidator.predicate(
        "section has id",
        typeof article.section.id === "string",
      );
      TestValidator.predicate(
        "section has name",
        typeof article.section.name === "string",
      );
      TestValidator.predicate(
        "section has description",
        typeof article.section.description === "string",
      );
    }
  }
}
