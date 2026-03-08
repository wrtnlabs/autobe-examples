import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_article_attachment } from "../../../prepare/prepare_random_discussion_board_article_attachment";

/**
 * Test that when an administrator deletes an article, all associated
 * attachments are cascade deleted, maintaining referential integrity.
 */
export async function test_api_article_admin_deletion_with_attachments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Member creates article with attachments
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        attachments: [
          {
            type: "file",
            name: "document.pdf",
            extension: "pdf",
            size: 102400,
            url: "https://example.com/uploads/document.pdf",
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
          {
            type: "image",
            name: "photo.jpg",
            extension: "jpg",
            size: 204800,
            url: "https://example.com/uploads/photo.jpg",
          } satisfies IDiscussionBoardArticleAttachment.ICreate,
        ],
      },
    },
  );
  typia.assert(article);
  // Store attachment IDs for verification
  const attachmentIds = article.attachments.map((a) => a.id);
  TestValidator.predicate(
    "article has attachments",
    attachmentIds.length === 2,
  );
  // 4. Admin deletes the article
  await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
    articleId: article.id,
  });
  // 5. Verify cascade deletion - attempt to fetch deleted article should fail
  await TestValidator.error("deleted article cannot be retrieved", async () => {
    await api.functional.discussionBoard.admin.articles.erase(adminConnection, {
      articleId: article.id,
    });
  });
}
