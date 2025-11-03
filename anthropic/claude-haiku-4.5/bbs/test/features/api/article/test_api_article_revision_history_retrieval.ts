import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleRevision";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleRevision";

export async function test_api_article_revision_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create member account for article authorship
  const memberEmail: string & tags.Format<"email"> =
    `test_${RandomGenerator.alphaNumeric(8)}@example.com` as string &
      tags.Format<"email">;
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);

  // Step 2: Create initial article with content
  const articleTitle = RandomGenerator.paragraph({ sentences: 3 });
  const articleContent = RandomGenerator.content({ paragraphs: 2 });
  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(createdArticle);
  TestValidator.equals(
    "article created with correct title",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article created with correct content",
    createdArticle.content,
    articleContent,
  );
  TestValidator.equals(
    "initial revision number is 0",
    createdArticle.revision_number,
    0,
  );

  // Step 3: Perform first edit - change title and content
  const updatedTitle1 = RandomGenerator.paragraph({ sentences: 3 });
  const updatedContent1 = RandomGenerator.content({ paragraphs: 2 });
  const firstEdit: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        title: updatedTitle1,
        content: updatedContent1,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(firstEdit);
  TestValidator.equals(
    "article updated with new title",
    firstEdit.title,
    updatedTitle1,
  );
  TestValidator.equals(
    "article updated with new content",
    firstEdit.content,
    updatedContent1,
  );
  TestValidator.equals(
    "revision number incremented to 1",
    firstEdit.revision_number,
    1,
  );

  // Step 4: Perform second edit - change content only
  const updatedContent2 = RandomGenerator.content({ paragraphs: 3 });
  const secondEdit: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.update(connection, {
      articleId: createdArticle.id,
      body: {
        content: updatedContent2,
      } satisfies IDiscussionBoardArticle.IUpdate,
    });
  typia.assert(secondEdit);
  TestValidator.equals(
    "article updated with new content only",
    secondEdit.content,
    updatedContent2,
  );
  TestValidator.equals(
    "title remains from first edit",
    secondEdit.title,
    updatedTitle1,
  );
  TestValidator.equals(
    "revision number incremented to 2",
    secondEdit.revision_number,
    2,
  );

  // Step 5: Retrieve revision history
  const revisionPage: IPageIDiscussionBoardArticleRevision =
    await api.functional.discussionBoard.articles.revisions.index(connection, {
      articleId: createdArticle.id,
    });
  typia.assert(revisionPage);

  // Step 6: Verify all revisions are present in chronological order
  const revisions = revisionPage.data;
  TestValidator.predicate(
    "revision history contains all three revisions",
    revisions.length >= 3,
  );

  // Check first revision (initial creation)
  const firstRevision = revisions[0];
  typia.assert(firstRevision);
  TestValidator.equals(
    "first revision title matches initial article title",
    firstRevision.title,
    articleTitle,
  );
  TestValidator.equals(
    "first revision content matches initial article content",
    firstRevision.content,
    articleContent,
  );
  TestValidator.equals(
    "first revision edit type is member_edit",
    firstRevision.edit_type,
    "member_edit",
  );
  TestValidator.predicate(
    "first revision has editor member ID",
    firstRevision.editor_member_id !== null &&
      firstRevision.editor_member_id !== undefined,
  );
  TestValidator.equals(
    "first revision moderator ID is null",
    firstRevision.editor_moderator_id,
    null,
  );

  // Check second revision (first edit)
  const secondRevision = revisions[1];
  typia.assert(secondRevision);
  TestValidator.equals(
    "second revision title matches first update",
    secondRevision.title,
    updatedTitle1,
  );
  TestValidator.equals(
    "second revision content matches first update",
    secondRevision.content,
    updatedContent1,
  );
  TestValidator.equals(
    "second revision edit type is member_edit",
    secondRevision.edit_type,
    "member_edit",
  );
  TestValidator.predicate(
    "second revision has editor member ID",
    secondRevision.editor_member_id !== null &&
      secondRevision.editor_member_id !== undefined,
  );

  // Check third revision (second edit)
  const thirdRevision = revisions[2];
  typia.assert(thirdRevision);
  TestValidator.equals(
    "third revision title matches first edit title",
    thirdRevision.title,
    updatedTitle1,
  );
  TestValidator.equals(
    "third revision content matches second update",
    thirdRevision.content,
    updatedContent2,
  );
  TestValidator.equals(
    "third revision edit type is member_edit",
    thirdRevision.edit_type,
    "member_edit",
  );
  TestValidator.predicate(
    "third revision has editor member ID",
    thirdRevision.editor_member_id !== null &&
      thirdRevision.editor_member_id !== undefined,
  );

  // Step 7: Verify chronological ordering with timestamps
  TestValidator.predicate(
    "revisions are ordered chronologically",
    new Date(firstRevision.created_at) <= new Date(secondRevision.created_at) &&
      new Date(secondRevision.created_at) <= new Date(thirdRevision.created_at),
  );

  // Step 8: Verify that the article ID matches across all revisions
  revisions.forEach((revision) => {
    TestValidator.equals(
      "revision belongs to correct article",
      revision.discussion_board_article_id,
      createdArticle.id,
    );
  });

  // Step 9: Verify pagination information
  TestValidator.predicate(
    "pagination current page is 0 or greater",
    revisionPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    revisionPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records matches revision count",
    revisionPage.pagination.records >= revisions.length,
  );
  TestValidator.predicate(
    "pagination pages is calculated correctly",
    revisionPage.pagination.pages > 0,
  );
}
