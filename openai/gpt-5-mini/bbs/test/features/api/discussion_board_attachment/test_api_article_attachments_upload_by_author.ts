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

export async function test_api_article_attachments_upload_by_author(
  connection: api.IConnection,
) {
  // 1. Register a new member (join)
  const username: string = RandomGenerator.alphaNumeric(8);
  const email: string = typia.random<string & tags.Format<"email">>();
  const password = "Str0ngP@ssword!"; // >=12 chars and mixed categories

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username,
        email,
        password,
        href: "https://example.com/articles/new",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2. Create an article as the authenticated member
  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 6, wordMin: 4, wordMax: 8 }),
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
      body: createArticleBody,
    });
  typia.assert(article);

  // 3. Prepare three attachments (2 images, 1 PDF) within business limits
  // Image sizes must be <= 5,242,880 bytes (5 MB)
  // Document sizes must be <= 20,971,520 bytes (20 MB)
  const image1 = {
    original_filename: "photo1.png",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "image/png",
    size: 4_000_000,
    is_image: true,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const image2 = {
    original_filename: "photo2.png",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "image/png",
    size: 3_200_000,
    is_image: true,
  } satisfies IDiscussionBoardAttachment.ICreate;

  const document1 = {
    original_filename: "specification.pdf",
    storage_key: typia.random<string & tags.Format<"uri">>(),
    mime_type: "application/pdf",
    size: 1_200_000,
    is_image: false,
  } satisfies IDiscussionBoardAttachment.ICreate;

  // 4. Upload attachments (sequential calls, one per attachment)
  const attachment1: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: image1,
      },
    );
  typia.assert(attachment1);

  const attachment2: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: image2,
      },
    );
  typia.assert(attachment2);

  const attachment3: IDiscussionBoardAttachment =
    await api.functional.discussionBoard.member.articles.attachments.create(
      connection,
      {
        articleId: article.id,
        body: document1,
      },
    );
  typia.assert(attachment3);

  // 5. Business assertions: linkage, mime types, sizes, is_image, created_at
  TestValidator.equals(
    "attachment1 linked to article",
    attachment1.article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment1 mime type matches",
    attachment1.mime_type,
    image1.mime_type,
  );
  TestValidator.equals(
    "attachment1 size matches",
    attachment1.size,
    image1.size,
  );
  TestValidator.predicate(
    "attachment1 is image",
    attachment1.is_image === true,
  );
  TestValidator.predicate(
    "attachment1 has created_at",
    attachment1.created_at !== null && attachment1.created_at !== undefined,
  );

  TestValidator.equals(
    "attachment2 linked to article",
    attachment2.article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment2 mime type matches",
    attachment2.mime_type,
    image2.mime_type,
  );
  TestValidator.equals(
    "attachment2 size matches",
    attachment2.size,
    image2.size,
  );
  TestValidator.predicate(
    "attachment2 is image",
    attachment2.is_image === true,
  );
  TestValidator.predicate(
    "attachment2 has created_at",
    attachment2.created_at !== null && attachment2.created_at !== undefined,
  );

  TestValidator.equals(
    "attachment3 linked to article",
    attachment3.article_id,
    article.id,
  );
  TestValidator.equals(
    "attachment3 mime type matches",
    attachment3.mime_type,
    document1.mime_type,
  );
  TestValidator.equals(
    "attachment3 size matches",
    attachment3.size,
    document1.size,
  );
  TestValidator.predicate(
    "attachment3 is not image",
    attachment3.is_image === false,
  );
  TestValidator.predicate(
    "attachment3 has created_at",
    attachment3.created_at !== null && attachment3.created_at !== undefined,
  );

  // 6. Additional safety checks: ensure no obvious secrets leaked in storage_key
  TestValidator.predicate(
    "attachment1 storage_key contains no obvious secret",
    !/token|secret|password/i.test(attachment1.storage_key),
  );
  TestValidator.predicate(
    "attachment2 storage_key contains no obvious secret",
    !/token|secret|password/i.test(attachment2.storage_key),
  );
  TestValidator.predicate(
    "attachment3 storage_key contains no obvious secret",
    !/token|secret|password/i.test(attachment3.storage_key),
  );
}
