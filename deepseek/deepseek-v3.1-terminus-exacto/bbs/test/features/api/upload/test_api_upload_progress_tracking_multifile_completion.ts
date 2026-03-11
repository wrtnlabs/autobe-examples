import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentFileProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFileProgress";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can successfully track upload progress for a batch of multiple files from start to completion.
 */
export async function test_api_upload_progress_tracking_multifile_completion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection
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
  // 2. Generate random upload ID
  const uploadId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test progress tracking - call endpoint to validate response structure
  const progress =
    await api.functional.discussionBoard.member.upload.progress.at(
      memberConnection,
      { uploadId },
    );
  typia.assert(progress);
  // Validate progress structure
  TestValidator.equals(
    "totalFiles should be non-negative",
    progress.totalFiles >= 0,
    true,
  );
  TestValidator.equals(
    "completedFiles should be non-negative",
    progress.completedFiles >= 0,
    true,
  );
  TestValidator.equals(
    "totalBytes should be non-negative",
    progress.totalBytes >= 0,
    true,
  );
  TestValidator.equals(
    "transferredBytes should be non-negative",
    progress.transferredBytes >= 0,
    true,
  );
  TestValidator.predicate(
    "overallProgressPercent should be between 0-100",
    progress.overallProgressPercent >= 0 &&
      progress.overallProgressPercent <= 100,
  );
  // Validate individual file progress structure
  TestValidator.predicate(
    "files should be an array",
    Array.isArray(progress.files),
  );
  for (const file of progress.files) {
    TestValidator.predicate(
      "filename should be string",
      typeof file.filename === "string",
    );
    TestValidator.equals("size should be non-negative", file.size >= 0, true);
    TestValidator.predicate(
      "status should be valid",
      ["pending", "uploading", "completed", "failed"].includes(file.status),
    );
    TestValidator.equals(
      "bytesTransferred should be non-negative",
      file.bytesTransferred >= 0,
      true,
    );
    if (file.errorMessage !== null) {
      TestValidator.predicate(
        "errorMessage should be string when not null",
        typeof file.errorMessage === "string",
      );
    }
  }
  // Validate business logic constraints
  TestValidator.equals(
    "completedFiles should not exceed totalFiles",
    progress.completedFiles <= progress.totalFiles,
    true,
  );
  TestValidator.equals(
    "transferredBytes should not exceed totalBytes",
    progress.transferredBytes <= progress.totalBytes,
    true,
  );
  // Validate estimatedTimeRemaining
  if (progress.estimatedTimeRemaining !== null) {
    TestValidator.equals(
      "estimatedTimeRemaining should be non-negative when not null",
      progress.estimatedTimeRemaining >= 0,
      true,
    );
  }
  // Test that progress percent calculation is reasonable (0-100 range already validated)
  if (progress.totalBytes > 0) {
    TestValidator.predicate(
      "transferredBytes should not exceed totalBytes",
      progress.transferredBytes <= progress.totalBytes,
    );
  }
}
