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
import { generate_random_hrms_member_organization_members_create } from "../../../generate/generate_random_hrms_member_organization_members_create";
import { generate_random_hrms_member_upload_requests_create } from "../../../generate/generate_random_hrms_member_upload_requests_create";
import { prepare_random_hrms_file_upload } from "../../../prepare/prepare_random_hrms_file_upload";
import { prepare_random_hrms_organization_member } from "../../../prepare/prepare_random_hrms_organization_member";

export async function test_api_upload_request_status_org_manager_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first member (will become organization manager)
  const member1Auth: IHrmsMember.IAuthorized = await authorize_member_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member1Auth);
  // Create a dedicated connection for member 1
  const member1Connection: api.IConnection = { host: connection.host };
  member1Connection.headers = {
    ...connection.headers,
    Authorization: member1Auth.token.access,
  };
  // 2. Create organization membership with manager role for member 1
  const organizationRole: IHrmsOrganizationRole.ISummary =
    member1Auth.organization_memberships.find(
      (m) =>
        m.organizationRole.name === "Manager" ||
        m.organizationRole.name === "Owner",
    )?.organizationRole!;
  TestValidator.predicate(
    "organization with manager/owner role exists",
    organizationRole !== undefined,
  );
  const organizationMembership =
    await api.functional.hrms.member.organization_members.create(
      member1Connection,
      {
        body: {
          hrms_member_id: member1Auth.id,
          hrms_organization_id: organizationRole.organization.id,
          hrms_organization_role_id: organizationRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  typia.assert(organizationMembership);
  const organizationId: string = organizationMembership.organization.id;
  // 3. Authenticate as second member (regular member who will create upload request)
  const member2Auth: IHrmsMember.IAuthorized = await authorize_member_join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(member2Auth);
  // Create a dedicated connection for member 2
  const member2Connection: api.IConnection = { host: connection.host };
  member2Connection.headers = {
    ...connection.headers,
    Authorization: member2Auth.token.access,
  };
  // Join member 2 to the same organization as regular member
  const existingMember2Membership = member2Auth.organization_memberships.find(
    (m) => m.organization.id === organizationId,
  );
  if (existingMember2Membership === undefined) {
    await api.functional.hrms.member.organization_members.create(
      member2Connection,
      {
        body: {
          hrms_member_id: member2Auth.id,
          hrms_organization_id: organizationId,
          hrms_organization_role_id: organizationRole.id,
        } satisfies IHrmsOrganizationMember.ICreate,
      },
    );
  }
  // 4. Member 2 creates a file upload request in the organization context
  const uploadRequest = await api.functional.hrms.member.upload_requests.create(
    member2Connection,
    {
      body: {
        organization_id: organizationId,
        original_filename: RandomGenerator.name() + ".pdf",
        file_type: "application/pdf",
        file_size: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<100> & tags.Maximum<10000>
        >(),
      } satisfies IHrmsFileUpload.ICreate,
    },
  );
  typia.assert(uploadRequest);
  const uploadRequestId: string = uploadRequest.id;
  // 5. Authenticate as member 1 (org manager) again
  const member1AuthAgain: IHrmsMember.IAuthorized =
    await authorize_member_login(member1Connection, {
      body: {
        email: member1Auth.email,
        password: "12345678",
      },
    });
  typia.assert(member1AuthAgain);
  // Create a dedicated connection for member 1 manager
  const member1ManagerConnection: api.IConnection = { host: connection.host };
  member1ManagerConnection.headers = {
    ...connection.headers,
    Authorization: member1AuthAgain.token.access,
  };
  // 6. Member 1 retrieves the validation status of the upload request created by member 2
  const validationStatus =
    await api.functional.hrms.member.upload_requests.validation_status.getValidationStatus(
      member1ManagerConnection,
      {
        uploadRequestId: uploadRequestId,
      },
    );
  typia.assert(validationStatus);
  // 7. Verify the manager successfully accessed the upload request status
  TestValidator.predicate(
    "has valid validation status",
    ["pending", "validating", "valid", "invalid"].includes(
      validationStatus.validationStatus,
    ),
  );
  TestValidator.predicate(
    "has valid upload state",
    ["pending", "validating", "completed", "failed"].includes(
      validationStatus.uploadState,
    ),
  );
  // 8. Verify the response contains the correct validation state and metadata
  TestValidator.predicate(
    "created at timestamp is valid",
    validationStatus.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated at timestamp is valid",
    validationStatus.updatedAt !== undefined,
  );
  // 9. Validate that the manager can view upload requests from all organization members
  // Create another upload request by member 1 to ensure manager access works bidirectionally
  const member1UploadRequest =
    await api.functional.hrms.member.upload_requests.create(
      member1ManagerConnection,
      {
        body: {
          organization_id: organizationId,
          original_filename: RandomGenerator.name() + ".docx",
          file_type:
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<100> &
              tags.Maximum<10000>
          >(),
        } satisfies IHrmsFileUpload.ICreate,
      },
    );
  typia.assert(member1UploadRequest);
  // Manager should be able to view their own upload request
  const selfValidationStatus =
    await api.functional.hrms.member.upload_requests.validation_status.getValidationStatus(
      member1ManagerConnection,
      {
        uploadRequestId: member1UploadRequest.id,
      },
    );
  typia.assert(selfValidationStatus);
  TestValidator.equals(
    "manager can view own upload request",
    selfValidationStatus.validationStatus,
    "pending",
  );
  // Verify cross-member visibility: member 1 can view member 2's upload
  TestValidator.equals(
    "manager can view another member's upload request",
    validationStatus.fileId,
    uploadRequest.file_id,
  );
}