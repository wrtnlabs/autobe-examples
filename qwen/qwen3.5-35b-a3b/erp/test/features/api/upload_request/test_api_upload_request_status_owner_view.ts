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

export async function test_api_upload_request_status_owner_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member by creating a new account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a file upload request for the organization
  // First, get the organization ID from member's organization memberships
  const organizationId = memberAuth.organization_memberships[0].organization.id;
  const uploadRequest = await api.functional.hrms.member.upload_requests.create(
    memberConnection,
    {
      body: {
        organization_id: organizationId,
        original_filename: RandomGenerator.paragraph({ sentences: 2 }) + ".txt",
        file_type: "text/plain",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<1073741824>
        >(),
      } satisfies IHrmsFileUpload.ICreate,
    },
  );
  typia.assert(uploadRequest);
  const uploadRequestId = uploadRequest.id;
  // 3. Retrieve the validation status of that upload request
  const validationStatus =
    await api.functional.hrms.member.upload_requests.validation_status.getValidationStatus(
      memberConnection,
      {
        uploadRequestId,
      },
    );
  typia.assert(validationStatus);
  // 4. Validate the response contains the expected fields
  // (typia.assert() already validates complete structure)
  // 5. Verify the initial validationStatus is 'pending' and uploadState is 'pending'
  TestValidator.equals(
    "initial validationStatus",
    validationStatus.validationStatus,
    "pending",
  );
  TestValidator.equals(
    "initial uploadState",
    validationStatus.uploadState,
    "pending",
  );
  // 6. Verify that fileId and permanentStoragePath are null for pending uploads
  TestValidator.equals(
    "fileId is null for pending upload",
    validationStatus.fileId,
    null,
  );
  TestValidator.equals(
    "permanentStoragePath is null for pending upload",
    validationStatus.permanentStoragePath,
    null,
  );
  // 7. Verify that the member can only view their own upload requests
  // Create another member account
  const otherMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  // Try to view another member's upload request - should fail with 403
  await TestValidator.error(
    "cannot view another member's upload request",
    async () => {
      await api.functional.hrms.member.upload_requests.validation_status.getValidationStatus(
        otherMemberConnection,
        {
          uploadRequestId,
        },
      );
    },
  );
}
