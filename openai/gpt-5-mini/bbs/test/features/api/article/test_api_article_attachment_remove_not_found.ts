import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

export async function test_api_article_attachment_remove_not_found(
  connection: api.IConnection,
) {
  /**
   * Test purpose:
   *
   * 1. Create and authenticate a member
   * 2. Create an article as that member
   * 3. Generate a syntactically valid UUID that does not exist among the article's
   *    attachments
   * 4. Attempt to delete the non-existent attachment and assert that an error is
   *    thrown (runtime not-found behavior)
   * 5. Confirm the precondition that the article exists and the fake id is not
   *    present in article.attachments
   */

  // 1) Member registration & authentication
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    });
  typia.assert(member);

  // 2) Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: typia.random<IDiscussionBoardArticle.ICreate>(),
    });
  typia.assert(article);

  // 3) Generate a valid UUID that is not present among the article's attachments
  let fakeAttachmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Ensure uniqueness against returned attachments (extremely unlikely collision)
  while (
    article.attachments.some(
      (a: IDiscussionBoardAttachment.ISummary) => a.id === fakeAttachmentId,
    )
  ) {
    fakeAttachmentId = typia.random<string & tags.Format<"uuid">>();
  }

  // 4) Confirm the article exists and the fake attachment is not present
  TestValidator.predicate(
    "article exists",
    article !== null && article !== undefined,
  );
  TestValidator.predicate(
    "attachment not present in article before delete",
    article.attachments.findIndex((a) => a.id === fakeAttachmentId) === -1,
  );

  // 5) Attempt to delete the non-existent attachment and expect an error
  await TestValidator.error(
    "deleting non-existent attachment should fail",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.erase(
        connection,
        {
          articleId: article.id,
          attachmentId: fakeAttachmentId,
        },
      );
    },
  );
}
