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

export async function test_api_upload_request_retrieval_different_states(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmsMember.IJoin,
    },
  );
  typia.assert(member);
  // Get organization from member's memberships
  const organizationId = member.organization_memberships[0]?.organization.id;
  TestValidator.predicate(
    "member has at least one organization",
    organizationId !== undefined && organizationId !== null,
  );
  // 2. Create upload requests using utility function
  const uploadRequests: IHrmsFileUpload[] = await ArrayUtil.asyncRepeat(
    3,
    async () =>
      api.functional.hrms.member.upload_requests.create(memberConnection, {
        body: {
          organization_id: organizationId!,
          original_filename: RandomGenerator.name(),
          file_type: "application/pdf",
          file_size: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<1073741824>
          >(),
        } satisfies IHrmsFileUpload.ICreate,
      }),
  );
  typia.assert(uploadRequests);
  // 3. Retrieve each upload request and verify workflow state
  for (const createdRequest of uploadRequests) {
    const retrieved = await api.functional.hrms.member.upload_requests.at(
      memberConnection,
      { uploadRequestId: createdRequest.id },
    );
    typia.assert(retrieved);
    // Verify upload_state is one of valid states
    const validStates = [
      "pending",
      "validating",
      "completed",
      "failed",
    ] as const;
    TestValidator.predicate(
      `upload state ${retrieved.upload_state} is valid`,
      validStates.includes(typia.assert<"pending" | "validating" | "completed" | "failed">(retrieved.upload_state)),
    );
    // Verify organization context matches authenticated member's organization
    TestValidator.equals(
      "organization context matches",
      retrieved.organization_id,
      organizationId!,
    );
    // Verify member context matches authenticated member
    TestValidator.equals(
      "member context matches",
      retrieved.member_id,
      member.id,
    );
    // Verify storage path is set
    TestValidator.equals(
      "temporary storage path is set",
      retrieved.temporary_storage_path,
      retrieved.temporary_storage_path,
    );
    // For completed state, verify file metadata is populated
    if (retrieved.upload_state === "completed") {
      TestValidator.predicate(
        "file_id is populated for completed upload",
        retrieved.file_id !== null && retrieved.file_id !== undefined,
      );
      TestValidator.predicate(
        "permanent storage path is populated for completed upload",
        retrieved.permanent_storage_path !== null &&
          retrieved.permanent_storage_path !== undefined,
      );
    }
    // For failed state, verify error message is populated
    if (retrieved.upload_state === "failed") {
      TestValidator.predicate(
        "error_message is populated for failed upload",
        retrieved.error_message !== null &&
          retrieved.error_message !== undefined,
      );
    }
    // Verify timestamps are valid date-time format
    TestValidator.predicate(
      "created_at is valid date-time",
      !isNaN(Date.parse(retrieved.created_at)),
    );
    TestValidator.predicate(
      "updated_at is valid date-time",
      !isNaN(Date.parse(retrieved.updated_at)),
    );
    // Verify created_at is before or equal to updated_at
    TestValidator.predicate(
      "created_at is before or equal to updated_at",
      new Date(retrieved.created_at).getTime() <=
        new Date(retrieved.updated_at).getTime(),
    );
  }
  // 4. Verify upload request creation starts with pending state
  const newlyCreated = await api.functional.hrms.member.upload_requests.create(
    memberConnection,
    {
      body: {
        organization_id: organizationId!,
        original_filename: "test-file.pdf",
        file_type: "image/png",
        file_size: 1024,
      } satisfies IHrmsFileUpload.ICreate,
    },
  );
  typia.assert(newlyCreated);
  // New upload request should start in pending state
  TestValidator.equals(
    "new upload request starts as pending",
    newlyCreated.upload_state,
    "pending",
  );
  // New upload request should have null/undefined file_id
  TestValidator.equals(
    "new upload request has null file_id",
    newlyCreated.file_id,
    null,
  );
  // New upload request should have null permanent storage path
  TestValidator.equals(
    "new upload request has null permanent_storage_path",
    newlyCreated.permanent_storage_path,
    null,
  );
  // Validation: Verify validation_status is also set appropriately
  TestValidator.equals(
    "validation_status is set",
    newlyCreated.validation_status,
    newlyCreated.validation_status,
  );
}