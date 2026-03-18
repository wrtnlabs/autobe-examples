import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFile";
import type { IHrmsFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsFileUpload";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
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

export async function test_api_file_upload_ownership_transfer(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Auth as file manager with file:manage permission
  const fileManagerConnection: api.IConnection = { host: connection.host };
  const fileManager = await authorize_member_join(fileManagerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
    },
  });
  typia.assert(fileManager);
  // Get file manager's organization
  const fileManagerOrg = fileManager.organization_memberships[0];
  typia.assert(fileManagerOrg);
  // Step 2: Auth as target employee
  const targetEmployeeConnection: api.IConnection = { host: connection.host };
  const targetEmployee = await authorize_member_join(targetEmployeeConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>() satisfies string,
      referrer: typia.random<string & tags.Format<"uri">>() satisfies string,
    },
  });
  typia.assert(targetEmployee);
  // Get target employee's organization
  const targetEmployeeOrg = targetEmployee.organization_memberships[0];
  typia.assert(targetEmployeeOrg);
  // Verify both users are in the same organization
  TestValidator.equals(
    "file manager and target employee share organization",
    fileManagerOrg.organization.id,
    targetEmployeeOrg.organization.id,
  );
  // Step 3: Create file upload request as file manager
  const uploadRequest =
    await generate_random_hrms_member_upload_requests_create(
      fileManagerConnection,
      {
        body: {
          organization_id: fileManagerOrg.organization.id,
          original_filename: "test_document.pdf",
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1> &
              tags.Maximum<1073741824>
          >() as number,
        },
      },
    );
  typia.assert(uploadRequest);
  // Step 4: Execute ownership transfer
  const updatedUploadRequest =
    await api.functional.hrms.member.upload_requests.assign_ownership.assignOwnership(
      fileManagerConnection,
      {
        uploadRequestId: uploadRequest.id,
        body: {
          member_id: targetEmployee.id,
        },
      },
    );
  typia.assert(updatedUploadRequest);
  // Step 5: Verify ownership changed to target employee
  TestValidator.equals(
    "owner is now target employee",
    updatedUploadRequest.member_id,
    targetEmployee.id,
  );
  // Step 6: Verify metadata preserved during transfer
  TestValidator.equals(
    "upload state preserved",
    updatedUploadRequest.upload_state,
    uploadRequest.upload_state,
  );
  TestValidator.equals(
    "validation status preserved",
    updatedUploadRequest.validation_status,
    uploadRequest.validation_status,
  );
  // Handle optional fields that can be null or undefined
  if (
    uploadRequest.permanent_storage_path !== null &&
    uploadRequest.permanent_storage_path !== undefined
  ) {
    TestValidator.equals(
      "permanent storage path preserved",
      updatedUploadRequest.permanent_storage_path,
      uploadRequest.permanent_storage_path,
    );
  }
  if (uploadRequest.file_id !== null && uploadRequest.file_id !== undefined) {
    TestValidator.equals(
      "file_id unchanged",
      updatedUploadRequest.file_id,
      uploadRequest.file_id,
    );
  }
  // Step 8: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at changed",
    uploadRequest.updated_at,
    updatedUploadRequest.updated_at,
  );
}
