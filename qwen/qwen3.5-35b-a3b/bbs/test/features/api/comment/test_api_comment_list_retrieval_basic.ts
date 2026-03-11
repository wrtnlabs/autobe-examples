import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import type { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import type { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import type { IEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardComment";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import type { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicPoliticalBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_economic_political_board_member_articles_comments_create } from "../../../generate/generate_random_economic_political_board_member_articles_comments_create";
import { generate_random_economic_political_board_member_articles_create } from "../../../generate/generate_random_economic_political_board_member_articles_create";
import { prepare_random_economic_political_board_article } from "../../../prepare/prepare_random_economic_political_board_article";
import { prepare_random_economic_political_board_attachment } from "../../../prepare/prepare_random_economic_political_board_attachment";
import { prepare_random_economic_political_board_comment } from "../../../prepare/prepare_random_economic_political_board_comment";

export async function test_api_comment_list_retrieval_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account for testing
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: (typia.random<string & tags.Format<"ipv4">>() satisfies string & tags.Format<"ipv4"> as string & tags.Format<"ipv4">),
    },
  });
  typia.assert(joinResult);
  // 2. Create article for testing
  const articleConnection: api.IConnection = { host: connection.host };
  articleConnection.headers = {
    ...connection.headers,
    Authorization: joinResult.token.access,
  };
  // Use a known valid section ID or random UUID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const article =
    await api.functional.economicPoliticalBoard.member.articles.create(
      articleConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          content: RandomGenerator.content({ paragraphs: 2 }),
          sectionId,
        } satisfies IEconomicPoliticalBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  // 3. Create multiple comments on the article
  const commentCount = 5;
  const commentsCreated: IEconomicPoliticalBoardComment[] = [];
  await ArrayUtil.asyncRepeat(commentCount, async (index) => {
    const comment =
      await api.functional.economicPoliticalBoard.member.articles.comments.create(
        articleConnection,
        {
          articleId: article.id,
          body: {
            content: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEconomicPoliticalBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    commentsCreated.push(comment);
  });
  // 4. Test default pagination and sorting (newest first)
  const defaultPageParams: IEconomicPoliticalBoardComment.IRequest = {
    page: 1,
    limit: 20,
    sortDirection: "newest",
  };
  const defaultResponse =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      connection,
      {
        articleId: article.id,
        body: defaultPageParams,
      },
    );
  typia.assert(defaultResponse);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records count",
    defaultResponse.pagination.records,
    commentCount,
  );
  TestValidator.equals(
    "pagination pages count",
    defaultResponse.pagination.pages,
    1,
  );
  // Validate comment count in data array
  TestValidator.equals(
    "comment data array length",
    defaultResponse.data.length,
    commentCount,
  );
  // 5. Verify comments are sorted by created_at in descending order (newest first)
  if (defaultResponse.data.length >= 2) {
    for (let i = 1; i < defaultResponse.data.length; i++) {
      TestValidator.predicate(
        `comment ${i} is newer than comment ${i - 1} (newest sort)`,
        () =>
          new Date(defaultResponse.data[i - 1].created_at) >=
          new Date(defaultResponse.data[i].created_at),
      );
    }
  }
  // 6. Verify each comment structure
  for (const comment of defaultResponse.data) {
    typia.assert(comment);
    TestValidator.predicate(
      "comment has valid id",
      /^[0-9a-f-]{36}$/i.test(comment.id),
    );
    TestValidator.predicate(
      "comment has non-empty content",
      comment.content.length > 0,
    );
    TestValidator.predicate(
      "comment has author",
      comment.author !== null && comment.author !== undefined,
    );
    TestValidator.predicate(
      "comment has article reference",
      comment.article !== null && comment.article !== undefined,
    );
    TestValidator.predicate(
      "comment has valid author id",
      /^[0-9a-f-]{36}$/i.test(comment.author.id),
    );
    TestValidator.equals(
      "comment article matches article",
      comment.article.id,
      article.id,
    );
    TestValidator.predicate(
      "comment has valid created_at",
      comment.created_at !== null && comment.created_at !== undefined,
    );
  }
  // 7. Test explicit oldest-first sorting
  const oldestParams: IEconomicPoliticalBoardComment.IRequest = {
    page: 1,
    limit: 20,
    sortDirection: "oldest",
  };
  const oldestResponse =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      connection,
      {
        articleId: article.id,
        body: oldestParams,
      },
    );
  typia.assert(oldestResponse);
  // Verify oldest-first sorting
  if (oldestResponse.data.length >= 2) {
    for (let i = 1; i < oldestResponse.data.length; i++) {
      TestValidator.predicate(
        `comment ${i} is older than comment ${i - 1} (oldest sort)`,
        () =>
          new Date(oldestResponse.data[i].created_at) >=
          new Date(oldestResponse.data[i - 1].created_at),
      );
    }
  }
  // 8. Test author filtering
  const firstComment = defaultResponse.data[0];
  const authorFilterParams: IEconomicPoliticalBoardComment.IRequest = {
    page: 1,
    limit: 20,
    authorId: firstComment.author.id,
  };
  const filteredResponse =
    await api.functional.economicPoliticalBoard.articles.comments.index(
      connection,
      {
        articleId: article.id,
        body: authorFilterParams,
      },
    );
  typia.assert(filteredResponse);
  // Verify filtered results contain only comments from the specified author
  TestValidator.equals(
    "filtered results page current",
    filteredResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "filtered results limit",
    filteredResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "filtered results records count matches data length",
    filteredResponse.pagination.records,
    filteredResponse.data.length,
  );
  for (const comment of filteredResponse.data) {
    TestValidator.equals(
      "comment author matches filter",
      comment.author.id,
      firstComment.author.id,
    );
  }
}