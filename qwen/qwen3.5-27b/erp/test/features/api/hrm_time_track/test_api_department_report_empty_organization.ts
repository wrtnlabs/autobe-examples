import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartmentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartmentReport";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test retrieving a department report for an organization with no departments.
 *
 * Validates that the department report endpoint correctly returns an empty hierarchical structure when the organization has no departments configured. This ensures the system handles edge cases gracefully without throwing errors.
 *
 * The test verifies that organizations without any departments still return a valid response structure, maintaining API consistency and preventing runtime errors in the client application when displaying department reports.
 *
 * 1. Register and authenticate as a member
 * 2. Create an organization without any departments
 * 3. Call the department report endpoint
 * 4. Verify the response has empty children array
 */
export async function test_api_department_report_empty_organization(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Create an organization without any departments
  const organization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Call the department report endpoint
  const report =
    await api.functional.hrmTimeTrack.member.reports.departments.report(
      memberConnection,
    );
  // 4. Verify the response has empty children array
  // For organizations with no departments, the report object exists but children is empty
  TestValidator.equals(
    "department report children should be empty array for organization with no departments",
    report.children,
    [],
  );
}