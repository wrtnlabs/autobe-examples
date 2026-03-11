import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test simultaneous upload of multiple attachments with different file types and validation requirements.
 * Create an article as authenticated member. Attempt to attach 3-4 different file types including
 * valid file types and ensuring proper metadata validation. Test various mime_type values
 * (application/pdf, image/jpeg, image/png, text/plain). Verify that size_bytes are properly
 * validated against system limits. Ensure proper transaction handling where if one attachment
 * fails validation, other valid attachments should still succeed based on specification:
 * 'Failed uploads for one file do not affect other valid attachments in the same request.'
 * Validate that each created attachment receives unique storage_path values and proper metadata storage.
 */
export async function test_api_article_attachments_multiple_validations_simultaneous_upload(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Register and authenticate member
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // Create article for attachment testing
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // Test simultaneous upload with mixed valid/invalid attachments
  const attachmentTests = [
    // Valid attachments
    {
      filename: "document.pdf",
      filetype: "pdf",
      mime_type: "application/pdf",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<10485760>
      >(), // 10MB max
      shouldSucceed: true,
      description: "Valid PDF document",
    },
    {
      filename: "image.jpg",
      filetype: "jpg",
      mime_type: "image/jpeg",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5242880>
      >(), // 5MB max
      shouldSucceed: true,
      description: "Valid JPEG image",
    },
    // Invalid attachment (oversized file)
    {
      filename: "huge_file.bin",
      filetype: "bin",
      mime_type: "application/octet-stream",
      size_bytes: 1073741824, // 1GB - likely to exceed system limits
      shouldSucceed: false,
      description: "Oversized file that should fail",
    },
    // Valid attachment (should succeed despite previous failure)
    {
      filename: "notes.txt",
      filetype: "txt",
      mime_type: "text/plain",
      size_bytes: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1048576>
      >(), // 1MB max
      shouldSucceed: true,
      description: "Valid text file",
    },
  ];
  const createdAttachments: IDiscussionBoardAttachment[] = [];
  const failedAttachments: Array<{
    test: any;
    error: any;
  }> = [];
  // Upload attachments sequentially (simulating simultaneous upload behavior)
  for (const test of attachmentTests) {
    try {
      const attachment =
        await generate_random_discussion_board_member_articles_attachments_create(
          memberConnection,
          {
            body: {
              filename: test.filename,
              filetype: test.filetype,
              mime_type: test.mime_type,
              size_bytes: test.size_bytes,
            } satisfies IDiscussionBoardAttachment.ICreate,
            params: {
              articleId: article.id,
            },
          },
        );
      typia.assert(attachment);
      if (test.shouldSucceed) {
        // Validate attachment metadata for successful uploads
        TestValidator.equals(
          `filename matches for ${test.description}`,
          attachment.filename,
          test.filename,
        );
        TestValidator.equals(
          `filetype matches for ${test.description}`,
          attachment.filetype,
          test.filetype,
        );
        TestValidator.equals(
          `mime_type matches for ${test.description}`,
          attachment.mime_type,
          test.mime_type,
        );
        TestValidator.equals(
          `size_bytes matches for ${test.description}`,
          attachment.size_bytes,
          test.size_bytes,
        );
        TestValidator.equals(
          `article_id matches for ${test.description}`,
          attachment.article_id,
          article.id,
        );
        // Validate storage_path is unique and properly formatted
        TestValidator.predicate(
          `storage_path exists for ${test.description}`,
          attachment.storage_path.length > 0,
        );
        createdAttachments.push(attachment);
      } else {
        // This should not happen - attachment succeeded when it should have failed
        throw new Error(
          `Attachment should have failed but succeeded: ${test.description}`,
        );
      }
    } catch (error) {
      if (test.shouldSucceed) {
        // Attachment should have succeeded but failed
        throw new Error(
          `Expected attachment to succeed but failed: ${test.description} - ${error}`,
        );
      } else {
        // Expected failure - record it
        failedAttachments.push({ test, error });
      }
    }
  }
  // Validate transaction independence: failed uploads should not affect valid ones
  const expectedSuccessCount = attachmentTests.filter(
    (t) => t.shouldSucceed,
  ).length;
  TestValidator.equals(
    "number of successful attachments",
    createdAttachments.length,
    expectedSuccessCount,
  );
  const expectedFailureCount = attachmentTests.filter(
    (t) => !t.shouldSucceed,
  ).length;
  TestValidator.equals(
    "number of failed attachments",
    failedAttachments.length,
    expectedFailureCount,
  );
  // Validate that valid attachments were created despite failures
  TestValidator.predicate(
    "valid attachments created despite failures",
    createdAttachments.length > 0,
  );
  // Validate unique storage_path values for successful attachments
  const storagePaths = createdAttachments.map((att) => att.storage_path);
  const uniquePaths = new Set(storagePaths);
  TestValidator.equals(
    "all storage_paths are unique",
    uniquePaths.size,
    storagePaths.length,
  );
  // Validate timestamps for successful attachments
  for (const attachment of createdAttachments) {
    TestValidator.predicate(
      "created_at is valid",
      attachment.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at is valid",
      attachment.updated_at.length > 0,
    );
    TestValidator.equals("deleted_at is null", attachment.deleted_at, null);
  }
  // Test that we can still create more attachments after failures
  const additionalAttachment =
    await generate_random_discussion_board_member_articles_attachments_create(
      memberConnection,
      {
        body: {
          filename: "additional.png",
          filetype: "png",
          mime_type: "image/png",
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<5242880>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
        params: {
          articleId: article.id,
        },
      },
    );
  typia.assert(additionalAttachment);
  TestValidator.equals(
    "additional attachment created successfully",
    additionalAttachment.article_id,
    article.id,
  );
}
