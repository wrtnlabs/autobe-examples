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

export async function test_api_upload_request_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member and create account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(authorized);
  // Extract member_id and organization_id from authorized response
  const memberId = authorized.id;
  const organizationId = authorized.organization_memberships[0].organization.id;
  // Step 2: Create file upload request
  const uploadRequest =
    await generate_random_hrms_member_upload_requests_create(memberConnection, {
      body: {
        organization_id: organizationId,
        original_filename: RandomGenerator.name() + ".pdf",
        file_type: "application/pdf",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<1073741824>
        >(),
      } satisfies IHrmsFileUpload.ICreate,
    });
  typia.assert(uploadRequest);
  // Step 3: Retrieve the upload request by ID
  const retrievedUploadRequest =
    await api.functional.hrms.member.upload_requests.at(memberConnection, {
      uploadRequestId: uploadRequest.id,
    });
  typia.assert(retrievedUploadRequest);
  // Step 4: Validate response contains correct data
  TestValidator.equals(
    "member_id matches authenticated user",
    retrievedUploadRequest.member_id,
    memberId,
  );
  TestValidator.equals(
    "organization_id matches expected",
    retrievedUploadRequest.organization_id,
    organizationId,
  );
  TestValidator.equals(
    "original_filename matches",
    retrievedUploadRequest.original_filename,
    uploadRequest.original_filename,
  );
  TestValidator.equals(
    "file_type matches",
    retrievedUploadRequest.file_type,
    uploadRequest.file_type,
  );
  TestValidator.equals(
    "file_size matches",
    retrievedUploadRequest.file_size,
    uploadRequest.file_size,
  );
  TestValidator.equals(
    "validation_status is pending",
    retrievedUploadRequest.validation_status,
    "pending",
  );
  TestValidator.equals(
    "upload_state is pending",
    retrievedUploadRequest.upload_state,
    "pending",
  );
  // Verify organization context object exists and matches
  TestValidator.equals(
    "organization context id matches",
    retrievedUploadRequest.organization.id,
    organizationId,
  );
  TestValidator.predicate(
    "organization context has name",
    retrievedUploadRequest.organization.name.length > 0,
  );
  // Verify member context object exists and matches
  TestValidator.equals(
    "member context id matches",
    retrievedUploadRequest.member.id,
    memberId,
  );
  TestValidator.equals(
    "member context email matches",
    retrievedUploadRequest.member.email,
    authorized.email,
  );
  TestValidator.equals(
    "member context display_name matches",
    retrievedUploadRequest.member.display_name,
    authorized.display_name,
  );
  // If upload_state is 'completed', verify file record exists
  if (retrievedUploadRequest.upload_state === "completed") {
    TestValidator.predicate(
      "file_id should exist when completed",
      retrievedUploadRequest.file_id !== null &&
        retrievedUploadRequest.file_id !== undefined,
    );
    TestValidator.predicate(
      "file record should exist when completed",
      retrievedUploadRequest.file !== null &&
        retrievedUploadRequest.file !== undefined,
    );
  }
}
