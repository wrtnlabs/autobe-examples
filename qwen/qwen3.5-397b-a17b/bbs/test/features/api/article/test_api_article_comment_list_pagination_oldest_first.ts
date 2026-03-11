import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
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

/**
 * Test article comment list pagination with oldest-first ordering.
 *
 * This test validates the comment retrieval endpoint with pagination support,
 * chronological ordering, and search functionality. It ensures comments are
 * returned in the correct order and pagination metadata is accurate.
 */
export async function test_api_article_comment_list_pagination_oldest_first(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup - create section
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 2,
          wordMax: 3,
        }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(section);
  // 2. Member setup - create article
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = await authorize_member_join(memberConnection, {
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
  typia.assert(memberJoin);
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 5,
        }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        sectionId: section.id,
      },
    },
  );
  typia.assert(article);
  // 3. Create multiple comments (8 comments for pagination testing)
  const commentContents = ArrayUtil.repeat(8, (index) => ({
    content: `Comment ${index + 1}: ${RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 })}`,
  }));
  const comments: IDiscussionBoardComment[] = [];
  for (const commentData of commentContents) {
    const comment =
      await generate_random_discussion_board_member_articles_comments_create(
        memberConnection,
        {
          body: commentData,
          params: { articleId: article.id },
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }
  // 4. Test comment retrieval with oldest-first ordering (default)
  const page1 = await api.functional.discussionBoard.articles.comments.index(
    memberConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 3,
        sort: "created_at_asc",
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.equals("page 1 total records", page1.pagination.records, 8);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);
  TestValidator.equals("page 1 data length", page1.data.length, 3);
  // Validate oldest-first order on page 1
  TestValidator.equals(
    "comment 1 matches first created",
    page1.data[0].id,
    comments[0].id,
  );
  TestValidator.equals(
    "comment 2 matches second created",
    page1.data[1].id,
    comments[1].id,
  );
  TestValidator.equals(
    "comment 3 matches third created",
    page1.data[2].id,
    comments[2].id,
  );
  // 5. Test page 2 retrieval
  const page2 = await api.functional.discussionBoard.articles.comments.index(
    memberConnection,
    {
      articleId: article.id,
      body: {
        page: 2,
        limit: 3,
        sort: "created_at_asc",
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 data length", page2.data.length, 3);
  TestValidator.equals("page 2 comment 1", page2.data[0].id, comments[3].id);
  TestValidator.equals("page 2 comment 2", page2.data[1].id, comments[4].id);
  TestValidator.equals("page 2 comment 3", page2.data[2].id, comments[5].id);
  // 6. Test page 3 retrieval (last page with 2 comments)
  const page3 = await api.functional.discussionBoard.articles.comments.index(
    memberConnection,
    {
      articleId: article.id,
      body: {
        page: 3,
        limit: 3,
        sort: "created_at_asc",
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  TestValidator.equals("page 3 data length", page3.data.length, 2);
  TestValidator.equals("page 3 comment 1", page3.data[0].id, comments[6].id);
  TestValidator.equals("page 3 comment 2", page3.data[1].id, comments[7].id);
  // 7. Test newest-first ordering (created_at_desc)
  const pageDesc = await api.functional.discussionBoard.articles.comments.index(
    memberConnection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 3,
        sort: "created_at_desc",
      } satisfies IDiscussionBoardComment.IRequest,
    },
  );
  typia.assert(pageDesc);
  // Validate newest-first order - should be reverse of oldest-first
  TestValidator.equals(
    "desc comment 1 is newest",
    pageDesc.data[0].id,
    comments[7].id,
  );
  TestValidator.equals(
    "desc comment 2 is second newest",
    pageDesc.data[1].id,
    comments[6].id,
  );
  TestValidator.equals(
    "desc comment 3 is third newest",
    pageDesc.data[2].id,
    comments[5].id,
  );
  // 8. Test search functionality
  const searchKeyword = "Comment 1";
  const searchResult =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          page: 1,
          limit: 10,
          sort: "created_at_asc",
          search: searchKeyword,
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchResult);
  // Should find only comments containing "Comment 1" (Comment 1 and Comment 10 if existed)
  TestValidator.predicate("search results contain keyword", () =>
    searchResult.data.every((comment) =>
      comment.content.includes(searchKeyword),
    ),
  );
  TestValidator.predicate(
    "search found at least one result",
    () => searchResult.data.length > 0,
  );
  // 9. Validate comment summary structure
  const firstComment = page1.data[0];
  TestValidator.predicate(
    "comment has id",
    () => firstComment.id !== undefined,
  );
  TestValidator.predicate(
    "comment has content",
    () => firstComment.content !== undefined,
  );
  TestValidator.predicate(
    "comment has author",
    () => firstComment.author !== undefined,
  );
  TestValidator.predicate(
    "author has display_name",
    () => firstComment.author.display_name !== undefined,
  );
  TestValidator.predicate(
    "comment has article",
    () => firstComment.article !== undefined,
  );
  TestValidator.predicate(
    "comment has created_at",
    () => firstComment.created_at !== undefined,
  );
}
