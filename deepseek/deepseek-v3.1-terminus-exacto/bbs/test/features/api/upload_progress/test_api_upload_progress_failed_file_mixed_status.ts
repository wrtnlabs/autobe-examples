import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentFileProgress } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentFileProgress";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
/**
 * Test that upload progress tracking correctly handles mixed success/failure scenarios
 * where some files succeed while others fail due to validation errors.
 */
export async function test_api_upload_progress_failed_file_mixed_status(connection: api.IConnection): Promise<void> {
    // Create member-specific connection
    const memberConnection: api.IConnection = { host: connection.host };
    // Register member using utility function
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
    // Generate upload session ID
    const uploadId = typia.random<string & tags.Format<"uuid">>();
    // Test progress endpoint
    const progress = await api.functional.discussionBoard.member.upload.progress.at(memberConnection, { uploadId });
    typia.assert(progress);
    // Validate progress structure
    TestValidator.predicate("total files non-negative", progress.totalFiles >= 0);
    TestValidator.predicate("completed files non-negative", progress.completedFiles >= 0);
    TestValidator.predicate("completed files <= total files", progress.completedFiles <= progress.totalFiles);
    TestValidator.predicate("transferred bytes non-negative", progress.transferredBytes >= 0);
    TestValidator.predicate("total bytes non-negative", progress.totalBytes >= 0);
    TestValidator.predicate("transferred bytes <= total bytes", progress.transferredBytes <= progress.totalBytes);
    TestValidator.predicate("progress percent valid", progress.overallProgressPercent >= 0 && progress.overallProgressPercent <= 100);
    // Validate files array
    TestValidator.predicate("files array exists", Array.isArray(progress.files));
    TestValidator.equals("files array length matches total files", progress.files.length, progress.totalFiles);
    // Validate individual file progress objects
    progress.files.forEach((file, index) => {
        TestValidator.predicate(`file ${index} filename exists`, typeof file.filename === "string" && file.filename.length > 0);
        TestValidator.predicate(`file ${index} size non-negative`, file.size >= 0);
        TestValidator.predicate(`file ${index} valid status`, ["pending", "uploading", "completed", "failed"].includes(file.status));
        TestValidator.predicate(`file ${index} bytes transferred non-negative`, file.bytesTransferred >= 0);
        TestValidator.predicate(`file ${index} bytes <= size`, file.bytesTransferred <= file.size);
    
        if (file.status === "completed") {
            TestValidator.equals(`file ${index} completed bytes equal size`, file.bytesTransferred, file.size);
            TestValidator.equals(`file ${index} completed error message null`, file.errorMessage, null);
        } else if (file.status === "failed") {
            TestValidator.predicate(`file ${index} failed has error message`, file.errorMessage !== null && file.errorMessage.length > 0);
        }
    });
    
    // Validate estimated time remaining
    if (progress.estimatedTimeRemaining !== null) {
        TestValidator.predicate("estimated time remaining non-negative", progress.estimatedTimeRemaining >= 0);
    }
}