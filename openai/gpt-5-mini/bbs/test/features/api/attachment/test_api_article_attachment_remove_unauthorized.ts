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

export async function test_api_article_attachment_remove_unauthorized(
  connection: api.IConnection,
) {
  // 1. Register a new member (SDK will set Authorization header on connection)
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: "https://example.test/",
      referrer: "https://example.test/",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // 2. Create an article as the authenticated member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 5 }),
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Upload an attachment to the created article
  const attachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: `${RandomGenerator.name(2)}.png`,
          storage_key: typia.random<string & tags.Format<"uri">>(),
          mime_type: "image/png",
          size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<0> &
              tags.Maximum<20971520>
          >(),
          is_image: true,
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  typia.assert(attachment);

  // 4. Attempt to delete the attachment without authentication
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.httpError(
    "unauthenticated delete should be rejected with 401 or 403",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.erase(
        unauthConn,
        {
          articleId: article.id,
          attachmentId: attachment.id,
        },
      );
    },
  );

  // 5. Verify that the attachment's deleted_at remains unset (no side-effect)
  TestValidator.predicate(
    "attachment not soft-deleted after unauthenticated delete attempt",
    attachment.deleted_at === null || attachment.deleted_at === undefined,
  );

  // 6. Cleanup / proof: delete the attachment as the authenticated member
  await api.functional.discussionBoard.member.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );
}
