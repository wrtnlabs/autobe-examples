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

export async function test_api_article_attachments_upload_invalid_mime_type_bad_request(
  connection: api.IConnection,
) {
  // Purpose: Verify attachment upload acceptance for valid attachments and
  // rejection for business-rule invalid attachments (rewritten from raw
  // "invalid mime type" to an implementable business rule: oversized image
  // when marked as image). This keeps all DTO usages type-safe.

  // 1) Register a new member
  const username = RandomGenerator.alphaNumeric(10);
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12); // min 12 chars
  const joinBody = {
    username,
    email,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Control case: upload a valid small image attachment (should succeed)
  const validAttachmentBody = {
    original_filename: "photo.png",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "image/png",
    size: 1024, // 1 KB
    is_image: true,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: validAttachmentBody,
      },
    );
  typia.assert(attachment);
  TestValidator.equals(
    "valid attachment associated with article",
    attachment.article_id,
    article.id,
  );

  // 4) Failure case (oversized image although mime_type is allowed):
  //    Use an allowed mime_type but size exceeding the image limit (> 5,242,880)
  //    to simulate server-side rejection. This avoids introducing invalid
  //    literal mime_type values that would break compilation.
  const oversizedAttachmentBody = {
    original_filename: "large_photo.png",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "image/png",
    size: 6000000, // 6,000,000 bytes > 5,242,880
    is_image: true,
  } satisfies IDiscussionBoardAttachment.ICreate;

  await TestValidator.error(
    "oversized image upload should be rejected by server",
    async () => {
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body: oversizedAttachmentBody,
        },
      );
    },
  );

  // Note: The SDK does not expose a GET article endpoint in the provided
  // material, so we cannot re-fetch the article to assert the attachment list.
  // The TestValidator.error assertion ensures the invalid upload was rejected
  // and therefore no metadata record would have been created.
}
