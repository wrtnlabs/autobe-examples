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

export async function test_api_article_attachments_upload_exceed_quota_conflict(
  connection: api.IConnection,
) {
  /**
   * Test: per-article attachment quota enforcement (sequential upload rewrite)
   *
   * Business goal:
   *
   * - Ensure an article can have at most 5 attachments total and at most 3
   *   images.
   * - After the maximum is reached, additional upload attempts must fail.
   *
   * Workflow:
   *
   * 1. Register a new member (auth + automatic header setup by SDK)
   * 2. Create a new article as that member
   * 3. Upload 3 images (image/png) and 2 documents (application/pdf) successfully
   * 4. Attempt a 6th upload (document) and expect a runtime error (quota
   *    enforcement)
   * 5. Assert that exactly 5 attachments were created (local observation)
   */

  // 1) Register a new member and authenticate (SDK sets connection.headers.Authorization)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: "StrongPass#2025",
        display_name: RandomGenerator.name(),
        href: "https://example.test/flow",
        referrer: "https://example.test/referrer",
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // 2) Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 6,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 8,
          sentenceMax: 12,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Local collection of created attachments for verification
  const createdAttachments: IDiscussionBoardAttachment[] = [];

  // Helper to create an attachment payload
  const makeAttachmentBody = (
    filename: string,
    mime: IDiscussionBoardAttachment.ICreate["mime_type"],
    size: number,
    isImage?: boolean,
  ) => {
    return {
      original_filename: filename,
      storage_key: typia.random<string & tags.Format<"uri">>(),
      mime_type: mime,
      size,
      is_image: isImage,
    } satisfies IDiscussionBoardAttachment.ICreate;
  };

  // 3) Upload attachments that should succeed: 3 images (<=5MB) + 2 docs (<=20MB)
  // Image sizes: 1_000_000 bytes each (1 MB)
  for (let i = 0; i < 3; ++i) {
    const body = makeAttachmentBody(
      `${RandomGenerator.alphaNumeric(8)}.png`,
      "image/png",
      1_000_000,
      true,
    );
    const attachment: IDiscussionBoardAttachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body,
        },
      );
    typia.assert(attachment);
    createdAttachments.push(attachment);
  }

  // Document uploads: 2 PDFs, size 1 MB each (well under document limit)
  for (let i = 0; i < 2; ++i) {
    const body = makeAttachmentBody(
      `${RandomGenerator.alphaNumeric(8)}.pdf`,
      "application/pdf",
      1_000_000,
      false,
    );
    const attachment: IDiscussionBoardAttachment =
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body,
        },
      );
    typia.assert(attachment);
    createdAttachments.push(attachment);
  }

  // At this point we should have exactly 5 attachments created successfully
  TestValidator.equals(
    "attachments count after five uploads",
    createdAttachments.length,
    5,
  );

  // 4) Attempt the 6th upload which should fail due to per-article quota
  await TestValidator.error(
    "sixth attachment upload should fail due to per-article quota",
    async () => {
      const body = makeAttachmentBody(
        `${RandomGenerator.alphaNumeric(8)}.pdf`,
        "application/pdf",
        1_000_000,
        false,
      );
      await api.functional.discussionBoard.member.articles.attachments.create(
        connection,
        {
          articleId: article.id,
          body,
        },
      );
    },
  );

  // 5) Confirm no additional attachments were created in this test's observed state
  // (we rely on local createdAttachments collection; the SDK does not expose a GET article attachments endpoint in provided materials)
  TestValidator.equals(
    "attachments count remains at 5 after failed sixth upload",
    createdAttachments.length,
    5,
  );
}
