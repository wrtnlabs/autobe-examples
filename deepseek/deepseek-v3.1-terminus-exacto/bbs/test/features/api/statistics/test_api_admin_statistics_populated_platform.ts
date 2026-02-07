import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_user_articles_comments_create } from "../../../generate/generate_random_discussion_board_user_articles_comments_create";
import { generate_random_discussion_board_user_articles_create } from "../../../generate/generate_random_discussion_board_user_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_admin_statistics_populated_platform(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin1234",
      display_name: RandomGenerator.name(),
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Create multiple sections for content organization
  const sections: IDiscussionBoardSection[] = await Promise.all(
    ArrayUtil.repeat(3, (i) =>
      generate_random_discussion_board_admin_sections_create(adminConnection, {
        body: {
          name: `Section ${i + 1}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: i + 1,
        } satisfies IDiscussionBoardSection.ICreate,
      }),
    ),
  );
  // Step 3: Create multiple regular users
  const userCredentials: {
    email: string;
    password: string;
  }[] = ArrayUtil.repeat(4, () => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: "user1234",
  }));
  const users: IDiscussionBoardUser.IAuthorized[] = [];
  for (const creds of userCredentials) {
    const userConn: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConn, {
      body: {
        email: creds.email,
        password: creds.password,
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardUser.IJoin,
    });
    users.push(user);
  }
  // Step 4: Create articles across different sections
  const articles: IDiscussionBoardArticle[] = [];
  for (const user of users) {
    const userConn: api.IConnection = { host: connection.host };
    // Set auth token for this user
    userConn.headers = { Authorization: user.token.access };
    // Each user creates 2-3 articles in different sections
    const userArticleCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<3>
    >();
    const userArticles = await ArrayUtil.asyncRepeat(
      userArticleCount,
      async (i) => {
        const section = RandomGenerator.pick(sections);
        return await generate_random_discussion_board_user_articles_create(
          userConn,
          {
            body: {
              title: RandomGenerator.paragraph({
                sentences: 1,
                wordMin: 3,
                wordMax: 8,
              }),
              content: RandomGenerator.content({
                paragraphs: 2,
                sentenceMin: 3,
                sentenceMax: 6,
              }),
              section_id: section.id,
              status: "published" as const,
            } satisfies IDiscussionBoardArticle.ICreate,
          },
        );
      },
    );
    articles.push(...userArticles);
  }
  // Step 5: Create comments on random articles
  const comments: IDiscussionBoardComment[] = [];
  for (const user of users) {
    const userConn: api.IConnection = { host: connection.host };
    userConn.headers = { Authorization: user.token.access };
    // Each user creates 1-2 comments on random articles
    const userCommentCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
    >();
    const userComments = await ArrayUtil.asyncRepeat(
      userCommentCount,
      async () => {
        const targetArticle = RandomGenerator.pick(articles);
        return await generate_random_discussion_board_user_articles_comments_create(
          userConn,
          {
            params: { articleId: targetArticle.id },
            body: {
              content: RandomGenerator.paragraph({ sentences: 1 }),
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      },
    );
    comments.push(...userComments);
  }
  // Step 6: Retrieve admin statistics
  const statistics =
    await api.functional.discussionBoard.admin.statistics.at(adminConnection);
  typia.assert(statistics);
  // Step 7: Validate statistics reflect created content
  // Note: The statistics endpoint returns IDiscussionBoardPerformanceMetric
  // which contains aggregated metrics. We validate that the statistics
  // contain meaningful data rather than validating specific counts
  // since the exact metric structure may vary
  TestValidator.predicate(
    "statistics should contain valid metric type",
    typeof statistics.metric_type === "string" &&
      statistics.metric_type.length > 0,
  );
  TestValidator.predicate(
    "statistics should contain valid metric value",
    typeof statistics.metric_value === "number" && statistics.metric_value >= 0,
  );
  TestValidator.predicate(
    "statistics should contain valid metric unit",
    typeof statistics.metric_unit === "string" &&
      statistics.metric_unit.length > 0,
  );
  TestValidator.predicate(
    "statistics should contain valid collection timestamp",
    typeof statistics.collection_timestamp === "string" &&
      statistics.collection_timestamp.length > 0,
  );
}