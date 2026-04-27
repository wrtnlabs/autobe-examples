import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_files_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_files_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_file } from "../../../prepare/prepare_random_hrm_time_tracking_organization_file";

/**
 * Test that a soft-deleted organization file returns 404 when retrieved.
 *
 * Validates the soft-deletion behavior where files with a non-null `deleted_at` timestamp are excluded from read operations. After soft-deleting a file, attempting to retrieve it via its file ID should result in a 404 Not Found response, confirming the `WHERE deleted_at IS NULL` filter is correctly applied.
 *
 * 1. Register a new member account and obtain authentication tokens.
 * 2. Create a new organization owned by the authenticated member.
 * 3. Upload a file attachment under the organization.
 * 4. Soft-delete the file via the erase endpoint.
 * 5. Attempt to retrieve the same file and expect a 404 HTTP error.
 */
export async function test_api_organization_file_retrieval_soft_deleted_file_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Upload a file under the organization
  const file =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(file);
  // 4. Soft-delete the file
  const fileId = file.id;
  await api.functional.hrmTimeTracking.member.organizations.files.erase(
    memberConnection,
    {
      organizationId: organization.id,
      fileId,
    },
  );
  // 5. Attempt to retrieve the soft-deleted file (expect 404)
  await TestValidator.httpError(
    "soft-deleted file is not found",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.files.at(
        memberConnection,
        {
          organizationId: organization.id,
          fileId,
        },
      );
    },
  );
}
