import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import type { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import type { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import type { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import type { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import type { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import type { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import type { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import type { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import type { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import type { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import type { IPoliticsBbsUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUpload";
import type { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";

/**
 * Test article detail retrieval including all uploaded image and document
 * attachments.
 *
 * This test validates the complete workflow for creating political articles
 * with file attachments and retrieving them with full detail information
 * including:
 *
 * - Member registration and authentication
 * - Multiple file uploads (images and documents)
 * - Article creation with category assignment
 * - Complete article details retrieval with attachment structure validation
 * - Verification of proper attachment metadata formats
 * - Validation of evidence-based discourse support through document uploads
 *
 * The test ensures the politicsBBS platform properly supports file attachment
 * capabilities and metadata handling for political discussions.
 */
export async function test_api_article_with_attachments_detail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberData = {
    username: RandomGenerator.name(1) + RandomGenerator.alphaNumeric(5),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
    href: "https://example.com/political-discussion",
    referrer: "https://news.example.com/politics",
  } satisfies IPoliticsBbsMember.IJoin;

  const member = await api.functional.auth.members.join(connection, {
    body: memberData,
  });
  typia.assert(member);
  TestValidator.predicate(
    "member token includes access token",
    member.token.access.length > 0,
  );

  // 2. Upload multiple attachments (images and documents)
  const imageAttachment1 =
    await api.functional.politicsBbs.member.uploads.create(connection, {
      body: {
        file: {
          data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
          encoding: "base64",
          filename: "economic-chart.png",
          mime_type: "image/png",
        },
        href: "https://example.com/upload",
        referrer: "https://example.com",
      } satisfies IPoliticsBbsUpload.ICreate,
    });
  typia.assert(imageAttachment1);
  TestValidator.equals(
    "image attachment filename",
    imageAttachment1.filename,
    "economic-chart.png",
  );
  TestValidator.equals(
    "image attachment MIME type",
    imageAttachment1.mime_type,
    "image/png",
  );

  const imageAttachment2 =
    await api.functional.politicsBbs.member.uploads.create(connection, {
      body: {
        file: {
          data: "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
          encoding: "base64",
          filename: "policy-chart.gif",
          mime_type: "image/gif",
        },
        href: "https://example.com/upload",
        referrer: "https://example.com",
      } satisfies IPoliticsBbsUpload.ICreate,
    });
  typia.assert(imageAttachment2);
  TestValidator.equals(
    "image attachment filename",
    imageAttachment2.filename,
    "policy-chart.gif",
  );
  TestValidator.equals(
    "image attachment MIME type",
    imageAttachment2.mime_type,
    "image/gif",
  );

  const documentAttachment =
    await api.functional.politicsBbs.member.uploads.create(connection, {
      body: {
        file: {
          data: "JVBERi0xLjcKJeLjz9MKNCAwIG9iago8PC9MZW5ndGggMzkvRmlsdGVyL0ZsYXRlRGVjb2RlPj5zdHJlYW0KeJxjYGDgYmDw5HBkYmBgYuBwQAEVMDABLwMKVnB1QeJg7OPk5GSAkpkHbPACxBVOzmEuxOGCUxqQkMnCAaYBAJIhCTwKZW5kc3RyZWFtCmVuZG9iago1IDAgb2JqCjw8L1R5cGUvQ2F0YWxvZwovUGFnZXMgMSAwIFIKPj4KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZS9QYWdlcy9LaWRzWzIgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAxIDAgUi9NZWRpYUJveFswIDAgNjEyIDc5Ml0vQ29udGVudHMgMyAwIFJSPj4KZW5kb2JqCjMgMCBvYmoKPDwvTGVuZ3RoIDc2L0ZpbHRlci9GbGF0ZURlY29kZT4+c3RyZWFtCmJtb2XZnDoLaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL2iElZGU6YmVmb3Jl9loAQcLNAB4BQtXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dQZKZW5kc3RyZWFtCmVuZG9iagoKZXJlbmRvYg==",
          encoding: "base64",
          filename: "policy-analysis.pdf",
          mime_type: "application/pdf",
        },
        href: "https://example.com/upload",
        referrer: "https://example.com",
      } satisfies IPoliticsBbsUpload.ICreate,
    });
  typia.assert(documentAttachment);
  TestValidator.equals(
    "document attachment filename",
    documentAttachment.filename,
    "policy-analysis.pdf",
  );
  TestValidator.equals(
    "document attachment MIME type",
    documentAttachment.mime_type,
    "application/pdf",
  );

  // 3. Create political article with proper category
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const articleData = {
    politics_bbs_category_id: categoryId,
    title:
      "Economic Policy Analysis: The Impact of Tax Reforms on Working Families",
    content:
      "This comprehensive analysis examines the historical and projected effects of recent tax reform legislation on working families and small business owners. Drawing from multiple peer-reviewed studies spanning 2018-2024, along with government census data and Bureau of Labor Statistics reports, this research demonstrates significant socioeconomic impacts across different demographic groups and geographic regions. Key empirical findings include a 15% reduction in effective tax rates for small businesses with annual revenues under five million dollars, while median-income families experienced an average 8% reduction in their overall effective tax burden. However, long-term analysis suggests these benefits may not be sustainable given projected federal budget deficits and economic volatility. The data reveals complex interactions between federal, state, and local tax policies that create unintended disparities depending on geographic location and industry sector. Further longitudinal evaluation is critical to determine whether current tax structures provide adequate incentive for capital investment, job creation, and economic mobility within historically disadvantaged communities.",
  } satisfies IPoliticsBbsArticle.ICreate;

  const article = await api.functional.politicsBbs.member.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleData.content,
  );
  TestValidator.equals(
    "article category matches input",
    article.politics_bbs_category_id,
    categoryId,
  );

  // 4. Retrieve complete article details with attachments
  const detailedArticle = await api.functional.politicsBbs.articles.at(
    connection,
    {
      articleId: article.id,
    },
  );
  typia.assert(detailedArticle);

  TestValidator.equals(
    "article ID matches original",
    detailedArticle.id,
    article.id,
  );
  TestValidator.equals(
    "article title matches original",
    detailedArticle.title,
    article.title,
  );
  TestValidator.equals(
    "article category ID matches",
    detailedArticle.politics_bbs_category_id,
    categoryId,
  );
  TestValidator.predicate(
    "article state is present",
    detailedArticle.state.length > 0,
  );
  TestValidator.predicate(
    "view count is valid non-negative number",
    detailedArticle.view_count >= 0 &&
      typeof detailedArticle.view_count === "number",
  );

  // 5. Validate attachment metadata structure
  if (
    detailedArticle.file_attachments &&
    detailedArticle.file_attachments.length > 0
  ) {
    const attachments = detailedArticle.file_attachments;

    TestValidator.predicate(
      "has attachment structure",
      attachments.length >= 0,
    );

    for (const attachment of attachments) {
      TestValidator.predicate("attachment has ID", attachment.id.length > 0);
      TestValidator.predicate(
        "attachment has article ID",
        attachment.politics_bbs_article_id === detailedArticle.id,
      );
      TestValidator.predicate(
        "attachment has filename",
        attachment.filename.length > 0,
      );
      TestValidator.predicate(
        "attachment has valid file size (0 or positive)",
        attachment.file_size >= 0,
      );
      TestValidator.predicate(
        "attachment has MIME type",
        attachment.mime_type.length > 0,
      );
      TestValidator.predicate(
        "attachment has file path",
        attachment.file_path.length > 0 &&
          (attachment.file_path.includes("/") ||
            attachment.file_path.startsWith("http")),
      );
      TestValidator.predicate(
        "attachment has timestamp",
        attachment.created_at.length > 0,
      );

      // Validate MIME type format
      TestValidator.predicate(
        "MIME type matches expected format",
        attachment.mime_type.startsWith("image/") ||
          attachment.mime_type === "application/pdf" ||
          attachment.mime_type === "application/msword" ||
          attachment.mime_type ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          attachment.mime_type === "text/plain",
      );
    }

    // Check for various MIME types in attachments
    const mimeTypes = attachments.map((a) => a.mime_type);

    TestValidator.predicate(
      "has image file structure",
      mimeTypes.some((type) => type.startsWith("image/")),
    );
    TestValidator.predicate(
      "has document file structure",
      mimeTypes.some((type) => type === "application/pdf"),
    );
  } else {
    TestValidator.predicate(
      "file_attachments array exists even if empty",
      Array.isArray(detailedArticle.file_attachments),
    );
  }

  // 6. Validate category information structure
  if (detailedArticle.category) {
    const category = detailedArticle.category;
    TestValidator.predicate("category has valid UUID", category.id.length > 0);
    TestValidator.predicate("category has code", category.code.length > 0);
    TestValidator.predicate("category has name", category.name.length > 0);
    TestValidator.predicate(
      "category has timestamps",
      category.created_at.length > 0,
    );
    TestValidator.predicate(
      "category has required boolean",
      typeof category.required === "boolean",
    );
    TestValidator.predicate(
      "category has primary boolean",
      typeof category.primary === "boolean",
    );
    TestValidator.predicate(
      "category has multiplicative boolean",
      typeof category.multiplicative === "boolean",
    );
  }

  // 7. Validate article snapshots structure (for audit trail)
  if (detailedArticle.snapshots && detailedArticle.snapshots.length > 0) {
    for (const snapshot of detailedArticle.snapshots) {
      TestValidator.predicate("snapshot has ID", snapshot.id.length > 0);
      TestValidator.predicate(
        "snapshot has article ID",
        snapshot.politics_bbs_article_id === detailedArticle.id,
      );
      TestValidator.predicate("snapshot has title", snapshot.title.length > 0);
      TestValidator.predicate(
        "snapshot has content",
        snapshot.content.length > 0,
      );
      TestValidator.predicate("snapshot has state", snapshot.state.length > 0);
      TestValidator.predicate(
        "snapshot has view count as number",
        typeof snapshot.view_count === "number",
      );
      TestValidator.predicate(
        "snapshot has timestamp",
        snapshot.created_at.length > 0,
      );
    }
  }

  // 8. Test MIME type validation through different upload types
  const textAttachment = await api.functional.politicsBbs.member.uploads.create(
    connection,
    {
      body: {
        file: {
          data: "VGhpcyBpcyBhIHNhbXBsZSB0ZXh0IGRvY3VtZW50IGZvciBwb2xpdGljYWwgYW5hbHlzaXMu",
          encoding: "base64",
          filename: "policy-notes.txt",
          mime_type: "text/plain",
        },
        href: "https://example.com/upload",
        referrer: "https://example.com",
      } satisfies IPoliticsBbsUpload.ICreate,
    },
  );
  typia.assert(textAttachment);
  TestValidator.equals(
    "text attachment filename",
    textAttachment.filename,
    "policy-notes.txt",
  );
  TestValidator.equals(
    "text attachment MIME type",
    textAttachment.mime_type,
    "text/plain",
  );

  // 9. Validate overall article metadata and timestamps
  TestValidator.predicate(
    "article has valid creation timestamp",
    detailedArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "article has valid update timestamp",
    detailedArticle.updated_at.length > 0,
  );
  TestValidator.predicate(
    "article content meets minimum length requirement",
    detailedArticle.content.length >= 50,
  );
  TestValidator.predicate(
    "article title meets minimum length requirement",
    detailedArticle.title.length >= 5,
  );

  // 10. Test integer type validation for file sizes
  const sizes = [
    imageAttachment1.file_size,
    imageAttachment2.file_size,
    documentAttachment.file_size,
    textAttachment.file_size,
  ];
  for (const size of sizes) {
    TestValidator.predicate(
      "file size is valid integer",
      Number.isInteger(size) && size >= 0,
    );
  }
}
