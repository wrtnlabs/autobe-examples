import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_file_recovery_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authentication setup - create member with organization management role
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(joinResponse);
  // Create member connection with token from join response
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { Authorization: joinResponse.token.access };
  // 2. Generate file data and list existing files to get a file to test with
  const existingFiles = await api.functional.hrms.member.files.index(
    memberConnection,
    {
      body: {
        ownerType: "organization" as "member" | "organization",
        ownerId: null,
        includeDeleted: true,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(existingFiles);
  // If no deleted files exist, generate a mock file for testing purposes
  // Note: In real scenario, you would need a file creation endpoint
  // For this test, we use typia.random to generate test data
  const mockFileData = typia.random<IHrmsFile>();
  typia.assert(mockFileData);
  // Use the mock file data for testing recovery flow
  const fileId = mockFileData.id;
  const fileName = mockFileData.filename;
  const fileCategory = typia.assert<
    "organization_logo" | "user_avatar" | "document"
  >(mockFileData.file_category);
  const validationStatus = typia.assert<
    "pending" | "validated" | "rejected"
  >(mockFileData.validation_status);
  // 3. Soft delete the file (sets deleted_at timestamp)
  const deletedFile =
    await api.functional.hrms.member.files.permanently_delete.permanentlyDelete(
      memberConnection,
      {
        fileId: fileId,
      },
    );
  typia.assert(deletedFile);
  // Verify file is in soft-deleted state (deleted_at is set)
  TestValidator.predicate(
    "file has deleted_at set after permanent delete",
    deletedFile.deleted_at !== null,
  );
  const deletedAtTimestamp = deletedFile.deleted_at;
  TestValidator.predicate(
    "deleted_at is valid date-time format",
    deletedAtTimestamp !== null && !isNaN(Date.parse(deletedAtTimestamp)),
  );
  // 4. Recover the deleted file
  const recoveredFile = await api.functional.hrms.member.files.recover(
    memberConnection,
    {
      fileId: fileId,
    },
  );
  typia.assert(recoveredFile);
  // 5. Recovery validation
  // Verify deleted_at is cleared (null) - file is active again
  TestValidator.equals(
    "deleted_at cleared after recovery",
    recoveredFile.deleted_at,
    null,
  );
  // Verify updated_at is updated to current time (within 10 seconds)
  const now = new Date();
  const recoveredUpdatedAt = new Date(recoveredFile.updated_at);
  const timeDiff = Math.abs(now.getTime() - recoveredUpdatedAt.getTime());
  TestValidator.predicate(
    "updated_at is current time (within 10 seconds)",
    timeDiff <= 10000,
  );
  // Verify file metadata remains intact
  TestValidator.equals("filename preserved", recoveredFile.filename, fileName);
  TestValidator.equals(
    "file_category preserved",
    recoveredFile.file_category,
    fileCategory,
  );
  TestValidator.equals(
    "validation_status preserved",
    recoveredFile.validation_status,
    validationStatus,
  );
  TestValidator.equals(
    "file_size preserved",
    recoveredFile.file_size,
    mockFileData.file_size,
  );
  TestValidator.equals(
    "mime_type preserved",
    recoveredFile.mime_type,
    mockFileData.mime_type,
  );
  // Verify organization_id is preserved
  TestValidator.equals(
    "organization_id preserved",
    recoveredFile.organization_id,
    mockFileData.organization_id,
  );
  // Verify owner information is preserved if applicable
  if (mockFileData.owner_id !== undefined) {
    TestValidator.equals(
      "owner_id preserved",
      recoveredFile.owner_id,
      mockFileData.owner_id,
    );
  }
  if (mockFileData.owner_type !== undefined) {
    TestValidator.equals(
      "owner_type preserved",
      recoveredFile.owner_type,
      mockFileData.owner_type,
    );
  }
  // Query active file list to confirm file is queryable
  const activeFiles = await api.functional.hrms.member.files.index(
    memberConnection,
    {
      body: {
        category: fileCategory,
        validationStatus: validationStatus,
        ownerType: typia.assert<"member" | "organization" | null>(
          mockFileData.owner_type ?? "organization",
        ),
        ownerId: mockFileData.owner_id ?? null,
        includeDeleted: false,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(activeFiles);
  // Verify recovered file appears in active list
  const recoveredInActiveList = activeFiles.data.some((f) => f.id === fileId);
  TestValidator.predicate(
    "recovered file appears in active file list",
    recoveredInActiveList,
  );
  // Verify file is no longer in deleted list
  const deletedFileList = await api.functional.hrms.member.files.index(
    memberConnection,
    {
      body: {
        ownerType: "organization" as "member" | "organization",
        ownerId: null,
        includeDeleted: true,
      } satisfies IHrmsFile.IRequest,
    },
  );
  typia.assert(deletedFileList);
  const stillInDeletedList = deletedFileList.data.some(
    (f) =>
      f.id === fileId && f.deleted_at !== null && f.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "file removed from deleted list after recovery",
    !stillInDeletedList,
  );
  // Note: Activity log verification would require additional API endpoint
  // that is not available in current SDK. The recovery operation itself
  // is validated through the deletion timestamp clearance.
}