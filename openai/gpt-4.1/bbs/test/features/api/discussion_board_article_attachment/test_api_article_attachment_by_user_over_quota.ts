import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

/**
 * Validate that the article attachment API enforces both attachment quota and
 * file size limits for discussion board users.
 *
 * Steps:
 *
 * 1. Register and authenticate a new user to get a fresh context.
 * 2. Simulate an article (generate UUID for articleId).
 * 3. Attach 5 files (within quota) successfully.
 * 4. Attempt to attach a 6th file (over quota) and expect an error.
 * 5. Attempt to attach a file over the 10MB size limit and expect an error.
 */
export async function test_api_article_attachment_by_user_over_quota(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new user
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<
    string & tags.MinLength<8> & tags.MaxLength<72> & tags.Format<"password">
  >();
  const user: IDiscussionBoardUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: { email, password } satisfies IDiscussionBoardUser.ICreate,
    });
  typia.assert(user);

  // 2. Simulate an article (random UUID for articleId)
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attach up to quota (5 attachments)
  for (let i = 0; i < 5; ++i) {
    const input = {
      file_name: RandomGenerator.paragraph({ sentences: 2 }) + ".png",
      mime_type: "image/png",
      file_size: 1048576, // 1MB
      file_uri: `https://files.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
    } satisfies IDiscussionBoardArticleAttachment.ICreate;
    const att =
      await api.functional.discussionBoard.user.articles.attachments.create(
        connection,
        {
          articleId,
          body: input,
        },
      );
    typia.assert(att);
  }

  // 4. Attempt to attach a 6th file -- should fail due to quota limit
  await TestValidator.error(
    "should fail to attach more than 5 files (quota exceeded)",
    async () => {
      const input = {
        file_name: RandomGenerator.paragraph({ sentences: 2 }) + ".png",
        mime_type: "image/png",
        file_size: 102400, // 100KB
        file_uri: `https://files.example.com/${RandomGenerator.alphaNumeric(10)}.png`,
      } satisfies IDiscussionBoardArticleAttachment.ICreate;
      await api.functional.discussionBoard.user.articles.attachments.create(
        connection,
        {
          articleId,
          body: input,
        },
      );
    },
  );

  // 5. Attempt to attach a file with file_size > 10MB (over limit)
  await TestValidator.error(
    "should fail when attaching a file with size over 10MB",
    async () => {
      const input = {
        file_name: RandomGenerator.paragraph({ sentences: 2 }) + ".pdf",
        mime_type: "application/pdf",
        file_size: 10485761, // 10MB + 1
        file_uri: `https://files.example.com/${RandomGenerator.alphaNumeric(10)}.pdf`,
      } satisfies IDiscussionBoardArticleAttachment.ICreate;
      await api.functional.discussionBoard.user.articles.attachments.create(
        connection,
        {
          articleId,
          body: input,
        },
      );
    },
  );
}
