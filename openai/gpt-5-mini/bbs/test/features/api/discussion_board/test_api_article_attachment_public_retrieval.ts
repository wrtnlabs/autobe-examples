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

export async function test_api_article_attachment_public_retrieval(
  connection: api.IConnection,
) {
  /** 1. Create member (author) */
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.local/article-editor",
    referrer: "https://example.local/",
  } satisfies IDiscussionBoardMember.IJoin;

  const author: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(author);

  /** 2. Verify email - use a generated token (see feasibility notes) */
  const verifyBody = {
    token: typia.random<string>(),
  } satisfies IDiscussionBoardMember.IVerifyEmail;
  const verified: IDiscussionBoardMember =
    await api.functional.auth.member.email.verify.verifyEmail(connection, {
      body: verifyBody,
    });
  typia.assert(verified);

  /** 3. Create a published article */
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 8,
      sentenceMax: 12,
    }),
    state: "published",
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  /** 4. Upload an attachment for the article */
  const imageSize =
    (typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>() % 5242880) +
    1024; // ensure >0 and <= ~5MB
  const attachmentCreateBody = {
    original_filename: `${RandomGenerator.name(2)}.png`,
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "image/png",
    size: imageSize as number satisfies number as number,
    is_image: true,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const createdAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentCreateBody,
      },
    );
  typia.assert(createdAttachment);

  /** 5. Public retrieval as anonymous caller */
  const publicConn: api.IConnection = { ...connection, headers: {} };

  const fetched: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.articles.attachments.at(publicConn, {
      articleId: article.id,
      attachmentId: createdAttachment.id,
    });
  typia.assert(fetched);

  // Business assertions
  TestValidator.equals(
    "attachment belongs to the article",
    fetched.article_id,
    article.id,
  );
  TestValidator.equals(
    "original filename matches",
    fetched.original_filename,
    createdAttachment.original_filename,
  );
  TestValidator.equals(
    "mime type matches",
    fetched.mime_type,
    createdAttachment.mime_type,
  );
  TestValidator.equals(
    "file size matches",
    fetched.size,
    createdAttachment.size,
  );
  TestValidator.predicate(
    "downloadUrl or cdnUrl present for public consumption",
    (fetched.downloadUrl !== null && fetched.downloadUrl !== undefined) ||
      (fetched.cdnUrl !== null && fetched.cdnUrl !== undefined),
  );

  /** 6. Negative case: mismatched articleId should error (do not assert HTTP codes) */
  await TestValidator.error(
    "mismatched articleId should not reveal attachment",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(publicConn, {
        articleId: typia.random<string & tags.Format<"uuid">>(),
        attachmentId: createdAttachment.id,
      });
    },
  );

  /** 7. Negative case: hidden article attachments are not publicly accessible */
  const hiddenArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 5 }),
    content: RandomGenerator.content({ paragraphs: 1 }),
    state: "hidden",
  } satisfies IDiscussionBoardArticle.ICreate;

  const hiddenArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: hiddenArticleBody,
    });
  typia.assert(hiddenArticle);

  const hiddenAttachmentBody = {
    original_filename: `${RandomGenerator.name(2)}.pdf`,
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "application/pdf",
    size: 1024,
    is_image: false,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const hiddenAttachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: hiddenArticle.id,
        body: hiddenAttachmentBody,
      },
    );
  typia.assert(hiddenAttachment);

  await TestValidator.error(
    "hidden article attachment should not be accessible publicly",
    async () => {
      await api.functional.discussionBoard.articles.attachments.at(publicConn, {
        articleId: hiddenArticle.id,
        attachmentId: hiddenAttachment.id,
      });
    },
  );
}
