import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IUploadRequestValidationStatusResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IUploadRequestValidationStatusResponse";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_upload_requests_create } from "../../../generate/generate_random_hrms_member_upload_requests_create";
import { prepare_random_hrms_file_upload } from "../../../prepare/prepare_random_hrms_file_upload";

export async function test_api_file_retrieval_organization_logo(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member);
  // 2. Get organization from member's organization memberships
  TestValidator.equals(
    "member has at least one organization",
    member.organization_memberships.length,
    1,
  );
  const orgMembership = member.organization_memberships[0];
  typia.assert(orgMembership);
  const organizationId = orgMembership.organization.id;
  const currentOrgId = orgMembership.organization.id;
  // 3. Create file upload request for organization logo
  const uploadRequest: IHrmsFileUpload =
    await generate_random_hrms_member_upload_requests_create(memberConnection, {
      body: {
        organization_id: organizationId,
        original_filename: "organization_logo.png",
        file_type: "image/png",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<1073741824>
        >(),
      } satisfies IHrmsFileUpload.ICreate,
    });
  typia.assert(uploadRequest);
  const uploadRequestId = uploadRequest.id;
  // 4. Poll validation status until completed
  let validationStatus: IUploadRequestValidationStatusResponse;
  do {
    validationStatus =
      await api.functional.hrms.member.upload_requests.validation_status.getValidationStatus(
        memberConnection,
        {
          uploadRequestId: uploadRequestId,
        },
      );
    typia.assert(validationStatus);
    // Wait a bit if still validating
    if (validationStatus.validationStatus === "validating") {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (
    validationStatus.validationStatus === "pending" ||
    validationStatus.validationStatus === "validating"
  );
  // Validate upload completed successfully
  TestValidator.equals(
    "upload validation status",
    validationStatus.validationStatus,
    "valid",
  );
  TestValidator.equals(
    "upload state",
    validationStatus.uploadState,
    "completed",
  );
  TestValidator.equals(
    "error message should be null",
    validationStatus.errorMessage,
    null,
  );
  TestValidator.equals(
    "file_id should not be null",
    validationStatus.fileId !== null,
    true,
  );
  const fileId = validationStatus.fileId!;
  // 5. Retrieve file metadata by fileId
  const file: IHrmsFile = await api.functional.hrms.member.files.at(
    memberConnection,
    {
      fileId: fileId,
    },
  );
  typia.assert(file);
  // 6. Validate all metadata fields
  TestValidator.equals("filename", file.filename, "organization_logo.png");
  TestValidator.equals("mime type", file.mime_type, "image/png");
  TestValidator.equals("file size", file.file_size, uploadRequest.file_size);
  TestValidator.notEquals(
    "storage path should not be empty",
    file.storage_path,
    "",
  );
  TestValidator.equals(
    "validation status",
    file.validation_status,
    "validated",
  );
  TestValidator.equals(
    "file category",
    file.file_category,
    "organization_logo",
  );
  // 7. Validate organization reference
  TestValidator.equals(
    "organization id matches",
    file.organization_id,
    currentOrgId,
  );
  TestValidator.equals(
    "organization id from reference matches",
    file.organization.id,
    currentOrgId,
  );
  // 8. Validate owner fields (organization-owned files have null owner)
  TestValidator.equals(
    "owner_type is null for org files",
    file.owner_type,
    null,
  );
  TestValidator.equals("owner is null for org files", file.owner, null);
  // 9. Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(Date.parse(file.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () => !isNaN(Date.parse(file.updated_at)),
  );
  // 10. Validate file is not soft-deleted
  TestValidator.equals(
    "deleted_at should be null (not soft-deleted)",
    file.deleted_at,
    null,
  );
}