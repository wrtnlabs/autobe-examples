import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_article_comments_filtering_pagination(
  connection: api.IConnection,
): Promise<void> {
  // ============================================
  // 1. SETUP: Create admin, section, article, and comments
  // ============================================
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  typia.assert(adminAuth);
  // Create section for article categorization
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {},
  );
  typia.assert(section);
  // Create first member connection and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = RandomGenerator.alphaNumeric(16);
  const member1DisplayName = RandomGenerator.name();
  const member1Join = await authorize_member_join(member1Connection, {
    body: {
      email: member1Email,
      password: member1Password,
      displayName: member1DisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member1Join);
  const member1Login = await authorize_member_login(member1Connection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(member1Login);
  // Create article
  const article = await generate_random_discussion_board_member_articles_create(
    member1Connection,
    {
      body: {
        discussion_board_section_id: section.id,
        title: RandomGenerator.alphabets(20),
        body: RandomGenerator.paragraph(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Create second member connection and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = RandomGenerator.alphaNumeric(16);
  const member2DisplayName = RandomGenerator.name();
  const member2Join = await authorize_member_join(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
      displayName: member2DisplayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member2Join);
  const member2Login = await authorize_member_login(member2Connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies IDiscussionBoardMember.ILogin,
  });
  typia.assert(member2Login);
  // Create multiple comments with different content and authors
  const keyword1 = RandomGenerator.alphabets(5);
  const keyword2 = RandomGenerator.alphabets(5);
  const keyword3 = RandomGenerator.alphabets(5);
  const comment1 =
    await generate_random_discussion_board_member_articles_comments_create(
      member1Connection,
      {
        params: { articleId: article.id },
        body: {
          content: `First comment with ${keyword1} content`,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment1);
  const comment2 =
    await generate_random_discussion_board_member_articles_comments_create(
      member2Connection,
      {
        params: { articleId: article.id },
        body: {
          content: `Second comment with ${keyword2} content from different author`,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment2);
  const comment3 =
    await generate_random_discussion_board_member_articles_comments_create(
      member1Connection,
      {
        params: { articleId: article.id },
        body: {
          content: `Third comment with ${keyword3} and ${keyword1} keywords`,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment3);
  const comment4 =
    await generate_random_discussion_board_member_articles_comments_create(
      member2Connection,
      {
        params: { articleId: article.id },
        body: {
          content: `Fourth comment with ${keyword2} from member2`,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment4);
  // ============================================
  // 2. TEST CONTENT SEARCH FILTER
  // ============================================
  const searchResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: keyword1,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(searchResults);
  TestValidator.equals(
    "content search returns matching comments",
    searchResults.data.length,
    2,
  );
  TestValidator.predicate(
    "all search results contain keyword",
    searchResults.data.every((c) => c.content.includes(keyword1)),
  );
  // ============================================
  // 3. TEST AUTHOR FILTER
  // ============================================
  const authorResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        author_id: member1Login.id,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(authorResults);
  TestValidator.equals(
    "author filter returns only member1's comments",
    authorResults.data.length,
    2,
  );
  TestValidator.predicate(
    "all author results are from member1",
    authorResults.data.every((c) => c.author.id === member1Login.id),
  );
  // ============================================
  // 4. TEST DATE RANGE FILTER
  // ============================================
  // Get all comments first to determine date range
  const allComments =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {} satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(allComments);
  TestValidator.equals("all comments retrieved", allComments.data.length, 4);
  // Filter by date range - should return all since all are within range
  const dateRangeResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        created_after: allComments.data[0].created_at,
        created_before:
          allComments.data[allComments.data.length - 1].created_at,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(dateRangeResults);
  TestValidator.predicate(
    "date range filter returns comments within range",
    dateRangeResults.data.length >= 2,
  );
  // ============================================
  // 5. TEST PAGINATION
  // ============================================
  const page1 = await api.functional.discussionBoard.articles.comments.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has correct limit", page1.data.length, 2);
  TestValidator.equals(
    "pagination current page is 1",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 2", page1.pagination.limit, 2);
  TestValidator.equals("pagination records is 4", page1.pagination.records, 4);
  TestValidator.equals("pagination pages is 2", page1.pagination.pages, 2);
  const page2 = await api.functional.discussionBoard.articles.comments.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 2,
        limit: 2,
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has correct limit", page2.data.length, 2);
  TestValidator.equals(
    "pagination current page is 2",
    page2.pagination.current,
    2,
  );
  // ============================================
  // 6. VERIFY OLDEST-FIRST SORTING ORDER
  // ============================================
  const sortedResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {},
    });
  typia.assert(sortedResults);
  for (let i = 1; i < sortedResults.data.length; i++) {
    TestValidator.predicate(
      `comment ${i} is older than comment ${i + 1}`,
      sortedResults.data[i - 1].created_at <= sortedResults.data[i].created_at,
    );
  }
  // ============================================
  // 7. TEST COMBINED FILTERS
  // ============================================
  const combinedResults =
    await api.functional.discussionBoard.articles.comments.index(connection, {
      articleId: article.id,
      body: {
        search: keyword1,
        author_id: member1Login.id,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardComment.IRequest,
    });
  typia.assert(combinedResults);
  TestValidator.equals(
    "combined filters work correctly",
    combinedResults.data.length,
    2,
  );
  TestValidator.predicate(
    "all combined results contain keyword and are from member1",
    combinedResults.data.every(
      (c) => c.content.includes(keyword1) && c.author.id === member1Login.id,
    ),
  );
}