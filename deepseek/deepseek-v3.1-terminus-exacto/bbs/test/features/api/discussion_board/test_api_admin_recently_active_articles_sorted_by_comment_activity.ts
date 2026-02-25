import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_articles_create } from "../../../generate/generate_random_discussion_board_admin_articles_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful paginated retrieval of articles sorted by recent comment activity for admin users.
 * Setup requires admin authentication via join endpoint. Then create sections, articles, and comments to generate test data.
 * Create multiple articles in a section. Add comments to some articles at different timestamps to establish recency patterns.
 * Ensure some articles have no comments (should use article.created_at). Test the endpoint with pagination parameters (page=1, limit=10).
 * Validate response pagination metadata matches expected total records and page count. Verify articles are ordered by most recent comment activity.
 * Ensure only published articles are included. Check each article summary contains expected fields.
 */
export async function test_api_admin_recently_active_articles_sorted_by_comment_activity(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Create multiple articles
  const articles: IDiscussionBoardArticle[] = [];
  // Article 1 - will have older comment
  const article1 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article1);
  articles.push(article1);
  // Article 2 - will have newer comment
  const article2 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article2);
  articles.push(article2);
  // Article 3 - no comments
  const article3 = await generate_random_discussion_board_admin_articles_create(
    adminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article3);
  articles.push(article3);
  // Create user connection for comments
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Add older comment to article 1
  const olderComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article1.id,
        },
      },
    );
  typia.assert(olderComment);
  // Add newer comment to article 2
  const newerComment =
    await generate_random_discussion_board_user_articles_comments_create(
      userConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardComment.ICreate,
        params: {
          articleId: article2.id,
        },
      },
    );
  typia.assert(newerComment);
  // Test the recently active endpoint
  const response =
    await api.functional.discussionBoard.admin.recently_active.recentlyActive(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardArticle.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata - assuming IPage<T> structure with data and pagination properties
  TestValidator.equals(
    "pagination current page",
    (response as any).pagination?.current ?? 1,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    (response as any).pagination?.limit ?? 10,
    10,
  );
  TestValidator.predicate(
    "pagination records count",
    ((response as any).pagination?.records ?? 0) >= 3,
  );
  TestValidator.predicate(
    "pagination pages count",
    ((response as any).pagination?.pages ?? 0) >= 1,
  );
  // Validate article summaries contain expected fields
  for (const article of response.data) {
    typia.assert(article);
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
      "article author has display_name",
      typeof article.author.display_name === "string",
    );
    TestValidator.predicate(
      "article has section",
      typeof article.section === "object",
    );
    TestValidator.predicate(
      "article section has name",
      typeof article.section.name === "string",
    );
    TestValidator.predicate(
      "article section has description",
      typeof article.section.description === "string",
    );
    // Validate that only published articles are included
    TestValidator.equals(
      "article status is published",
      article.status,
      "published",
    );
  }
  // Verify ordering by comment activity
  // Article with newer comment should come before article with older comment
  // Article with no comments should come last
  if (response.data.length >= 3) {
    // Find articles in response
    const responseArticle2 = response.data.find((a) => a.id === article2.id);
    const responseArticle1 = response.data.find((a) => a.id === article1.id);
    const responseArticle3 = response.data.find((a) => a.id === article3.id);
    if (responseArticle2 && responseArticle1 && responseArticle3) {
      const index2 = response.data.indexOf(responseArticle2);
      const index1 = response.data.indexOf(responseArticle1);
      const index3 = response.data.indexOf(responseArticle3);
      // Article with newer comment should come before article with older comment
      TestValidator.predicate(
        "article with newer comment comes first",
        index2 < index1,
      );
      // Article with no comments should come after articles with comments
      TestValidator.predicate(
        "article with no comments comes last",
        index3 > index1,
      );
    }
  }
}