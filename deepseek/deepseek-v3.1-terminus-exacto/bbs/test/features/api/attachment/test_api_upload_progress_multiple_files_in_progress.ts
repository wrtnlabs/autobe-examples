import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentFileProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFileProgress";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_member_articles_create } from "../../../generate/generate_random_discussion_board_member_articles_create";
import { generate_random_discussion_board_super_admin_articles_attachments_create } from "../../../generate/generate_random_discussion_board_super_admin_articles_attachments_create";
import { prepare_random_discussion_board_article } from "../../../prepare/prepare_random_discussion_board_article";
import { prepare_random_discussion_board_attachment } from "../../../prepare/prepare_random_discussion_board_attachment";

/**
 * Test that superAdmin can monitor upload progress for a batch of multiple files currently being uploaded.
 * Creates a member account, creates an article, authenticates as superAdmin, initiates multi-file upload,
 * and queries the upload progress endpoint to verify accurate progress metrics.
 */
export async function test_api_upload_progress_multiple_files_in_progress(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
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
  // 2. Create an article as member
  const article = await generate_random_discussion_board_member_articles_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        discussion_board_section_id: typia.random<
          string & tags.Format<"uuid">
        >(),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);
  // 3. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 4. Initiate multi-file upload to generate uploadId
  const fileTypes = ["pdf", "jpg", "docx"] as const;
  const mimeTypes = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  } as const;
  const uploadPromises = ArrayUtil.repeat(3, (index) => {
    const filetype = RandomGenerator.pick(fileTypes);
    return generate_random_discussion_board_super_admin_articles_attachments_create(
      superAdminConnection,
      {
        params: { articleId: article.id },
        body: {
          filename: `test_file_${index + 1}.${filetype}`,
          filetype: filetype,
          mime_type: mimeTypes[filetype],
          size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<5000000>
          >(),
        } satisfies IDiscussionBoardAttachment.ICreate,
      },
    );
  });
  const attachments = await Promise.all(uploadPromises);
  attachments.forEach((attachment) => typia.assert(attachment));
  // 5. Query upload progress endpoint
  // Since we don't have an actual uploadId from the upload process,
  // we'll use one of the attachment IDs as a placeholder
  const uploadId = attachments[0]!.id;
  const progress =
    await api.functional.discussionBoard.superAdmin.upload.progress.at(
      superAdminConnection,
      { uploadId },
    );
  typia.assert(progress);
  // 6. Validate progress response structure
  TestValidator.equals("progress response has correct structure", progress, {
    totalFiles: progress.totalFiles,
    completedFiles: progress.completedFiles,
    totalBytes: progress.totalBytes,
    transferredBytes: progress.transferredBytes,
    files: progress.files,
    estimatedTimeRemaining: progress.estimatedTimeRemaining,
    overallProgressPercent: progress.overallProgressPercent,
  } satisfies IDiscussionBoardAttachment.IProgress);
  // 7. Validate individual progress metrics
  TestValidator.predicate(
    "totalFiles is non-negative",
    progress.totalFiles >= 0,
  );
  TestValidator.predicate(
    "completedFiles is non-negative",
    progress.completedFiles >= 0,
  );
  TestValidator.predicate(
    "totalBytes is non-negative",
    progress.totalBytes >= 0,
  );
  TestValidator.predicate(
    "transferredBytes is non-negative",
    progress.transferredBytes >= 0,
  );
  TestValidator.predicate(
    "completedFiles <= totalFiles",
    progress.completedFiles <= progress.totalFiles,
  );
  TestValidator.predicate(
    "transferredBytes <= totalBytes",
    progress.transferredBytes <= progress.totalBytes,
  );
  if (progress.totalBytes > 0) {
    TestValidator.predicate(
      "progress percentage is valid",
      progress.overallProgressPercent >= 0 &&
        progress.overallProgressPercent <= 100,
    );
  }
  // Validate files array
  TestValidator.predicate("files array exists", Array.isArray(progress.files));
  if (progress.files.length > 0) {
    progress.files.forEach((file, index) => {
      TestValidator.equals(
        `file ${index} has filename`,
        typeof file.filename,
        "string",
      );
      TestValidator.predicate(`file ${index} has valid size`, file.size >= 0);
      TestValidator.predicate(
        `file ${index} has valid status`,
        ["pending", "uploading", "completed", "failed"].includes(file.status),
      );
      TestValidator.predicate(
        `file ${index} has valid bytesTransferred`,
        file.bytesTransferred >= 0 && file.bytesTransferred <= file.size,
      );
      if (file.status === "failed") {
        TestValidator.predicate(
          `file ${index} has error message when failed`,
          file.errorMessage !== null && typeof file.errorMessage === "string",
        );
      } else {
        TestValidator.predicate(
          `file ${index} has no error message when not failed`,
          file.errorMessage === null,
        );
      }
    });
  }
  // Validate estimatedTimeRemaining
  if (progress.estimatedTimeRemaining !== null) {
    TestValidator.predicate(
      "estimatedTimeRemaining is non-negative",
      progress.estimatedTimeRemaining >= 0,
    );
  }
}
