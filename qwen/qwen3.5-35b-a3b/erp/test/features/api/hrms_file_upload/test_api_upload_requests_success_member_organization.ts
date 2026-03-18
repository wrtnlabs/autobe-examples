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

export async function test_api_upload_requests_success_member_organization(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: typia.random<IHrmsMember.IJoin>(),
  });
  typia.assert(memberAuth);
  // Step 2: Extract organization_id from member's organization memberships
  const organizationMembership = memberAuth.organization_memberships[0];
  typia.assert(organizationMembership);
  typia.assert(organizationMembership.organization);
  // Step 3: Create file upload request with valid metadata using utility function
  // The prepare_random_hrms_file_upload function handles organization preparation
  const uploadRequest =
    await generate_random_hrms_member_upload_requests_create(memberConnection, {
      body: {
        organization_id: organizationMembership.organization.id,
      },
    });
  typia.assert(uploadRequest);
  // Step 4: Verify record has correct initial state
  TestValidator.equals(
    "validation status is pending",
    uploadRequest.validation_status,
    "pending",
  );
  TestValidator.equals(
    "upload state is pending",
    uploadRequest.upload_state,
    "pending",
  );
  // Use typia.assert to narrow nullable types before comparison
  const validatedFileId = typia.assert<
    (string & tags.Format<"uuid">) | null | undefined
  >(uploadRequest.file_id);
  TestValidator.equals(
    "file_id is null on creation",
    validatedFileId,
    undefined,
  );
  const validatedPermanentPath = typia.assert<string | null | undefined>(
    uploadRequest.permanent_storage_path,
  );
  TestValidator.equals(
    "permanent_storage_path is null",
    validatedPermanentPath,
    undefined,
  );
  const validatedErrorMessage = typia.assert<string | null | undefined>(
    uploadRequest.error_message,
  );
  TestValidator.equals(
    "error_message is null",
    validatedErrorMessage,
    undefined,
  );
  TestValidator.equals(
    "temporary_storage_path exists",
    uploadRequest.temporary_storage_path.length > 0,
    true,
  );
  // Step 5: Verify organization and member relationships
  TestValidator.equals(
    "organization_id matches membership",
    uploadRequest.organization_id,
    organizationMembership.organization.id,
  );
  TestValidator.equals(
    "member_id matches authenticated member",
    uploadRequest.member_id,
    memberAuth.id,
  );
  TestValidator.equals(
    "organization matches request",
    uploadRequest.organization.id,
    organizationMembership.organization.id,
  );
  TestValidator.equals(
    "member matches request",
    uploadRequest.member.id,
    memberAuth.id,
  );
  // Step 6: Verify file metadata fields
  TestValidator.equals(
    "filename is set",
    uploadRequest.original_filename.length > 0,
    true,
  );
  TestValidator.equals(
    "file_type is set",
    uploadRequest.file_type.length > 0,
    true,
  );
  TestValidator.equals(
    "file_size is positive",
    uploadRequest.file_size > 0,
    true,
  );
  // Step 7: Verify timestamps are set
  TestValidator.predicate(
    "created_at is set",
    uploadRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    uploadRequest.updated_at !== undefined,
  );
}
