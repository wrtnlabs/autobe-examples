import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Validate that a discussion board member can delete their own article.
 *
 * This test performs the following steps:
 *
 * 1. Registers a new discussion board member and authenticates.
 * 2. Creates a new discussion board article owned by that member.
 * 3. Deletes the article using the authenticated member’s credentials.
 * 4. Attempts to delete the article again to verify deletion permanence and that
 *    the article is no longer accessible.
 *
 * Due to the lack of a dedicated GET article API in the provided SDK, the test
 * uses a second deletion attempt to confirm the article is gone and
 * inaccessible. This ensures proper authorization and irreversible article
 * deletion.
 *
 * All API calls validate correct authorization contexts and proper error
 * handling.
 */
export async function test_api_discussion_board_article_delete_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new member and authenticate
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
        password: "P@ssw0rd123",
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.ICreate,
    });
  typia.assert(member);

  // 2. Create a new article owned by this member
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.discussionBoardArticles.create(
      connection,
      {
        body: {
          title: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 8,
          }),
          content: RandomGenerator.content({
            paragraphs: 3,
            sentenceMin: 5,
            sentenceMax: 10,
            wordMin: 4,
            wordMax: 10,
          }),
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article belongs to member",
    article.discussion_board_member_id,
    member.id,
  );

  // 3. Delete the article as the authenticated author
  await api.functional.discussionBoard.member.discussionBoardArticles.erase(
    connection,
    {
      id: article.id,
    },
  );

  // 4. Verify deletion by attempting to delete again to confirm article is gone
  await TestValidator.error(
    "deleted article should not be deletable again",
    async () => {
      await api.functional.discussionBoard.member.discussionBoardArticles.erase(
        connection,
        {
          id: article.id,
        },
      );
    },
  );
}
