import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_comment_update_edit_count_incremented(
  connection: api.IConnection,
) {
  // Step 1: Create a member account
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "Password123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member should be created with valid ID",
    member.id !== null && member.id !== undefined,
  );

  // Step 2: Create an article to post comments on
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article should be created successfully",
    article.id !== null && article.id !== undefined,
  );

  // Step 3: Create an initial comment
  const initialComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(initialComment);
  TestValidator.equals(
    "initial comment should have edit_count of 0",
    initialComment.edit_count,
    0,
  );
  const initialUpdatedAt = initialComment.updated_at;

  // Step 4: Perform first update and verify edit_count increments to 1
  const firstUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.update(connection, {
      articleId: article.id,
      commentId: initialComment.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(firstUpdate);
  TestValidator.equals(
    "after first update, edit_count should be 1",
    firstUpdate.edit_count,
    1,
  );
  TestValidator.predicate(
    "updated_at should change after first edit",
    firstUpdate.updated_at !== initialUpdatedAt,
  );
  const firstUpdatedAt = firstUpdate.updated_at;

  // Step 5: Perform second update and verify edit_count increments to 2
  const secondUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.update(connection, {
      articleId: article.id,
      commentId: initialComment.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(secondUpdate);
  TestValidator.equals(
    "after second update, edit_count should be 2",
    secondUpdate.edit_count,
    2,
  );
  TestValidator.predicate(
    "updated_at should change after second edit",
    secondUpdate.updated_at !== firstUpdatedAt,
  );
  const secondUpdatedAt = secondUpdate.updated_at;

  // Step 6: Perform third update and verify edit_count increments to 3
  const thirdUpdate: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.update(connection, {
      articleId: article.id,
      commentId: initialComment.id,
      body: {
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IDiscussionBoardComment.IUpdate,
    });
  typia.assert(thirdUpdate);
  TestValidator.equals(
    "after third update, edit_count should be 3",
    thirdUpdate.edit_count,
    3,
  );
  TestValidator.predicate(
    "updated_at should change after third edit",
    thirdUpdate.updated_at !== secondUpdatedAt,
  );

  // Step 7: Verify the final state - comment ID and article ID should remain unchanged
  TestValidator.equals(
    "comment ID should remain unchanged after edits",
    thirdUpdate.id,
    initialComment.id,
  );
  TestValidator.equals(
    "article ID should remain unchanged after edits",
    thirdUpdate.discussion_board_article_id,
    article.id,
  );

  // Step 8: Verify edit history progression
  TestValidator.predicate(
    "all timestamps should be in chronological order",
    initialUpdatedAt < firstUpdatedAt &&
      firstUpdatedAt < secondUpdatedAt &&
      secondUpdatedAt < thirdUpdate.updated_at,
  );
}
