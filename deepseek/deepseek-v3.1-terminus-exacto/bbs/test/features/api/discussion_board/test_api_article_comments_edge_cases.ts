import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";

export async function test_api_article_comments_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // Create article for testing
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test 1: Empty comments scenario
  const emptyComments =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(emptyComments);
  TestValidator.equals("empty comments array", emptyComments.data.length, 0);
  TestValidator.equals(
    "total records should be 0",
    emptyComments.pagination.records,
    0,
  );
  TestValidator.equals(
    "total pages should be 0",
    emptyComments.pagination.pages,
    0,
  );
  // Test 2: Pagination boundaries with exact limit matching
  const limit = 5;
  const comments = await ArrayUtil.asyncRepeat(
    limit,
    async (index) =>
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          params: { articleId: article.id },
          body: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      ),
  );
  comments.forEach((comment) => typia.assert(comment));
  const pageResult =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: limit,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(pageResult);
  TestValidator.equals("exact limit matching", pageResult.data.length, limit);
  TestValidator.equals(
    "total records should match",
    pageResult.pagination.records,
    limit,
  );
  TestValidator.equals(
    "total pages should be 1",
    pageResult.pagination.pages,
    1,
  );
  // Test 3: Chronological ordering with edited comments
  const firstComment = comments[0];
  const secondComment = comments[1];
  // Verify chronological order (oldest first)
  TestValidator.predicate(
    "comments sorted by creation time",
    new Date(firstComment.created_at) < new Date(secondComment.created_at),
  );
  // Test 4: Invalid article ID error handling
  await TestValidator.error("invalid article ID should throw", async () => {
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  });
  // Note: Banned user scenario cannot be tested with current available APIs
  // as there are no admin functions provided for banning users
}
