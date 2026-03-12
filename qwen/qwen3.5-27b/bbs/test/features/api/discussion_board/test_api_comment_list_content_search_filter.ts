import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { generate_random_discussion_board_member_articles_comments_create } from "../../../generate/generate_random_discussion_board_member_articles_comments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_comment } from "../../../prepare/prepare_random_discussion_board_comment";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test that comments can be filtered by content text search using the search parameter.
 *
 * This test verifies that the comment list API correctly filters comments based on
 * text search within comment content. It creates multiple comments with varied
 * content and validates that only comments containing the search term are returned.
 */
export async function test_api_comment_list_content_search_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
      href: "https://test.com/admin",
      referrer: "https://test.com/login",
    } satisfies IDiscussionBoardAdministrator.ILogin,
  });
  // 2. Create a section for the article
  const section =
    await api.functional.discussionBoard.administrator.sections.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Member setup
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 4. Create an article in the section
  const article = await api.functional.discussionBoard.member.articles.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        section_id: section.id,
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 5. Create multiple comments with varied content for search testing
  const commentsToCreate = [
    "This is an important update",
    "General discussion here",
    "Need more feedback",
    "Important topic discussion",
    "Another general comment",
  ];
  const createdComments: IDiscussionBoardComment[] = [];
  for (const content of commentsToCreate) {
    const comment =
      await api.functional.discussionBoard.member.articles.comments.create(
        memberConnection,
        {
          articleId: article.id,
          body: {
            content,
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    typia.assert(comment);
    createdComments.push(comment);
  }
  // 6. Test search for 'important' keyword
  const searchResults =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "important",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(searchResults);
  // 7. Verify only comments containing 'important' are returned
  TestValidator.equals(
    "filtered comments count",
    searchResults.pagination.records,
    2,
  );
  // 8. Verify all returned comments contain the search term (case-insensitive)
  for (const comment of searchResults.data) {
    TestValidator.predicate(
      "comment contains search term important",
      comment.content.toLowerCase().includes("important"),
    );
  }
  // 9. Verify pagination metadata is correct
  TestValidator.equals(
    "pagination current page",
    searchResults.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination has correct limit",
    searchResults.pagination.limit >= searchResults.data.length,
  );
  // 10. Test search for 'general' keyword
  const generalSearchResults =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "general",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(generalSearchResults);
  TestValidator.equals(
    "general search comments count",
    generalSearchResults.pagination.records,
    2,
  );
  // 11. Verify all returned comments contain 'general'
  for (const comment of generalSearchResults.data) {
    TestValidator.predicate(
      "comment contains general",
      comment.content.toLowerCase().includes("general"),
    );
  }
  // 12. Test search for non-existent term
  const noMatchResults =
    await api.functional.discussionBoard.articles.comments.index(
      memberConnection,
      {
        articleId: article.id,
        body: {
          search: "nonexistentkeyword12345",
        } satisfies IDiscussionBoardComment.IRequest,
      },
    );
  typia.assert(noMatchResults);
  TestValidator.equals(
    "no match search returns empty",
    noMatchResults.pagination.records,
    0,
  );
  TestValidator.equals(
    "no match search data array is empty",
    noMatchResults.data.length,
    0,
  );
}
