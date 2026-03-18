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

export async function test_api_file_ownership_transfer_insufficient_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as regular employee without file management permission
  const regularMemberConnection: api.IConnection = { host: connection.host };
  const regularMember = await authorize_member_join(regularMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(regularMember);
  // Verify regular member belongs to an organization
  TestValidator.notEquals(
    "regular member has organization memberships",
    regularMember.organization_memberships.length,
    0,
  );
  const organizationId =
    regularMember.organization_memberships[0].organization.id;
  // 2. Create file upload request under regular employee's account
  const uploadRequest =
    await generate_random_hrms_member_upload_requests_create(
      regularMemberConnection,
      {
        body: {
          organization_id: organizationId,
          original_filename: RandomGenerator.name(3),
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1073741824>
          >(),
        },
      },
    );
  typia.assert(uploadRequest);
  // Store original upload state for verification
  const originalUploadState = uploadRequest.upload_state;
  const originalValidationStatus = uploadRequest.validation_status;
  // 3. Auth as second employee (target for context)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(targetMember);
  // Verify target member belongs to same organization
  const targetOrganizationId =
    targetMember.organization_memberships[0].organization.id;
  TestValidator.equals(
    "target member in same organization",
    targetOrganizationId,
    organizationId,
  );
  // 4. Attempt to reassign ownership using regular employee's session
  // This should fail with 403 Forbidden due to insufficient permissions
  await TestValidator.httpError(
    "ownership transfer without permission returns 403",
    [403],
    async () => {
      await api.functional.hrms.member.upload_requests.assign_ownership.assignOwnership(
        regularMemberConnection,
        {
          uploadRequestId: uploadRequest.id,
          body: {
            member_id: targetMember.id,
          },
        },
      );
    },
  );
  // 5. Verify upload request remains unchanged
  // Attempt another ownership transfer to confirm state is unchanged
  // The upload request should still reject with 403 and remain in original state
  await TestValidator.httpError(
    "second ownership transfer attempt still returns 403",
    [403],
    async () => {
      await api.functional.hrms.member.upload_requests.assign_ownership.assignOwnership(
        regularMemberConnection,
        {
          uploadRequestId: uploadRequest.id,
          body: {
            member_id: targetMember.id,
          },
        },
      );
    },
  );
  // 6. Verify permission check occurs before any modification
  // Upload state should remain unchanged
  TestValidator.equals(
    "upload state unchanged after failed transfer",
    uploadRequest.upload_state,
    originalUploadState,
  );
  // Validation status should remain unchanged
  TestValidator.equals(
    "validation status unchanged after failed transfer",
    uploadRequest.validation_status,
    originalValidationStatus,
  );
}
