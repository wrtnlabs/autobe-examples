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
 * Test that retrieving a non-existent file ID returns 404 NOT FOUND.
 *
 * Validates that the system correctly returns 404 when a file ID that does not exist in the organization is requested. The organization context is validated by first creating an organization and uploading a file to it. A random UUID that does not match any existing file is then used to verify the 404 response.
 *
 * Special attention is given to the security aspect: the system returns 404 rather than 403 to avoid leaking information about whether a file exists.
 *
 * 1. Register and authenticate a new member.
 * 2. Create a new organization as the tenant boundary.
 * 3. Upload a valid file to confirm the organization context is set up.
 * 4. Attempt to retrieve a file with a non-existent UUID and expect 404.
 */
export async function test_api_organization_file_retrieval_non_existent_file_404(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  // 3. Upload a valid file to confirm organization context is set up
  const file =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        params: {
          organizationId,
        },
      },
    );
  typia.assert(file);
  // 4. Attempt to retrieve a file with a non-existent UUID -> expect 404
  const nonExistentFileId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent file returns 404",
    404,
    async () => {
      await api.functional.hrmTimeTracking.member.organizations.files.at(
        memberConnection,
        {
          organizationId,
          fileId: nonExistentFileId,
        },
      );
    },
  );
}
