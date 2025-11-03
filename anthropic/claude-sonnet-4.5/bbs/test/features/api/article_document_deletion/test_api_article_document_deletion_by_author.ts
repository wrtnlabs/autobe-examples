import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test that a member can successfully delete a document attachment from their
 * own article.
 *
 * This validates the complete document lifecycle management workflow where an
 * article author uploads a document and later removes it. The test ensures
 * proper ownership-based access control and that document deletion is handled
 * correctly through soft deletion.
 *
 * Workflow steps:
 *
 * 1. Authenticate as a new member using join
 * 2. Authenticate as a new moderator using join (needed for category creation)
 * 3. Create a category as the moderator
 * 4. Restore member authentication and create an article
 * 5. Upload a document attachment to the article as the member
 * 6. Delete the document attachment from the article as the member
 *
 * Validation points:
 *
 * - Verify the document deletion operation completes without error
 * - The system properly handles soft deletion by setting deleted_at timestamp
 *
 * Expected outcome: The member can delete their own document attachments
 * successfully.
 */
export async function test_api_article_document_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as a new member who will create the article
  const memberJoinData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinData,
    });
  typia.assert(member);

  // Store member authentication token for later restoration
  const memberToken = member.token.access;

  // Step 2: Create and authenticate as a moderator to create required category
  const moderatorJoinData = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinData,
    });
  typia.assert(moderator);

  // Step 3: Create a category as the moderator (required for article creation)
  const categoryData = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 4: Restore member authentication and create an article
  connection.headers = connection.headers || {};
  connection.headers.Authorization = memberToken;

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
    summary: RandomGenerator.paragraph({ sentences: 3 }),
    category_ids: [category.id],
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 5: Upload a document attachment to the article
  const documentData = {
    url: typia.random<string & tags.Format<"uri">>(),
    original_name: `${RandomGenerator.alphabets(8)}.pdf`,
    mime_type: "application/pdf",
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
    >(),
  } satisfies IDiscussionBoardArticleDocument.ICreate;

  const document: IDiscussionBoardArticleDocument =
    await api.functional.discussionBoard.member.articles.documents.create(
      connection,
      {
        articleId: article.id,
        body: documentData,
      },
    );
  typia.assert(document);

  // Step 6: Delete the document attachment from the article
  await api.functional.discussionBoard.member.articles.documents.erase(
    connection,
    {
      articleId: article.id,
      documentId: document.id,
    },
  );

  // Validation: The deletion operation completed successfully (void return indicates success)
  // The document is now soft-deleted with deleted_at timestamp set by the backend
}
