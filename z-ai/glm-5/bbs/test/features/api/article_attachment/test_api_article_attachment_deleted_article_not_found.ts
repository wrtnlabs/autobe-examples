import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_attachments_create } from "../../../generate/generate_random_discussion_board_member_articles_attachments_create";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

/**
 * Test that attachment retrieval returns 404 when the parent article has been soft-deleted.
 *
 * Prerequisites:
 * 1. Create a member account via /auth/member/join
 * 2. Create an article via /member/articles
 * 3. Upload an attachment to the article via /member/articles/{articleId}/attachments
 * 4. Delete the article via /member/articles/{articleId} (soft delete)
 *
 * Test Steps:
 * 1. Call GET /articles/{articleId}/attachments/{attachmentId} with the deleted article's ID
 * 2. Use the attachment ID from the previously uploaded attachment
 * 3. Verify the API returns 404 Not Found
 */
export async function test_api_article_attachment_deleted_article_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an article
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {},
  );
  typia.assert(article);
  // 3. Upload an attachment to the article
  const attachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(attachment);
  // 4. Delete the article (soft delete)
  await api.functional.discussionBoard.member.articles.erase(memberConnection, {
    articleId: article.id,
  });
  // 5. Try to retrieve the attachment - should return 404 Not Found
  await TestValidator.error(
    "attachment not found after article deleted",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(
        memberConnection,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );
}
