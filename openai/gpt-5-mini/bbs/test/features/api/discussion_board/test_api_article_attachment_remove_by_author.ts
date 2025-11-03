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

export async function test_api_article_attachment_remove_by_author(
  connection: api.IConnection,
) {
  // 1) Register a new member (join) and obtain authentication in connection.headers
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/articles/new",
    referrer: "https://example.com",
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: joinBody,
    });
  typia.assert(member);

  // 2) Create an article as the authenticated member
  const articleBody = {
    title: RandomGenerator.paragraph({ sentences: 5, wordMin: 5, wordMax: 10 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleBody,
    });
  typia.assert(article);

  // 3) Upload an attachment for that article
  const attachmentBody = {
    original_filename: `${RandomGenerator.alphaNumeric(6)}.png`,
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "image/png",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<5242880>
    >(),
    is_image: true,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const attachment: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: attachmentBody,
      },
    );
  typia.assert(attachment);

  // Business validation: ensure hierarchical linkage
  TestValidator.equals(
    "attachment.article_id should match created article id",
    attachment.article_id,
    article.id,
  );

  // 4) Delete (erase) the attachment as the same authenticated member
  await api.functional.discussionBoard.member.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // 5) Verify idempotency: repeated delete should not crash (should complete)
  await api.functional.discussionBoard.member.articles.attachments.erase(
    connection,
    {
      articleId: article.id,
      attachmentId: attachment.id,
    },
  );

  // If we reached here without throwing, delete operations behaved as expected
  TestValidator.predicate(
    "erase calls completed without throwing (idempotent)",
    true,
  );
}
