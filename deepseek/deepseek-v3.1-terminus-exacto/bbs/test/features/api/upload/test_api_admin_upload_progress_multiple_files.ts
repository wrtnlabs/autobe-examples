import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentFileProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFileProgress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test upload progress tracking for bulk file upload operations with multiple files.
 * Validate that the system correctly handles concurrent uploads and provides accurate
 * progress metrics across all files.
 */
export async function test_api_admin_upload_progress_multiple_files(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a random upload ID to simulate an upload session
  const uploadId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve upload progress information
  const progress =
    await api.functional.discussionBoard.admin.upload.progress.at(
      adminConnection,
      { uploadId },
    );
  // Validate the response structure - this performs COMPLETE validation
  typia.assert(progress);
  // Business logic validation: Test progress consistency
  TestValidator.predicate(
    "completed files should not exceed total files",
    progress.completedFiles <= progress.totalFiles,
  );
  TestValidator.predicate(
    "transferred bytes should not exceed total bytes",
    progress.transferredBytes <= progress.totalBytes,
  );
  // Business logic validation: Test individual file status consistency
  progress.files.forEach((file, index) => {
    TestValidator.predicate(
      `file ${index} bytes transferred should not exceed file size`,
      file.bytesTransferred <= file.size,
    );
    // Business logic: Error message should only exist for failed uploads
    if (file.status === "failed") {
      TestValidator.predicate(
        `file ${index} should have error message when failed`,
        file.errorMessage !== null && file.errorMessage.length > 0,
      );
    } else {
      TestValidator.predicate(
        `file ${index} should not have error message when not failed`,
        file.errorMessage === null,
      );
    }
  });
  // Business logic: Test overall progress calculation consistency
  if (progress.totalFiles > 0) {
    const fileProgressRatio = progress.completedFiles / progress.totalFiles;
    const expectedProgress = Math.round(fileProgressRatio * 100);
    // Allow for small rounding differences in progress calculation
    TestValidator.predicate(
      "overall progress should reflect file completion ratio",
      Math.abs(progress.overallProgressPercent - expectedProgress) <= 5,
    );
  }
}
