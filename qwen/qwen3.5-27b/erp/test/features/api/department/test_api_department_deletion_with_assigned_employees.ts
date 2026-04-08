import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
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
import { generate_random_hrm_time_track_member_departments_create } from "../../../generate/generate_random_hrm_time_track_member_departments_create";
import { generate_random_hrm_time_track_member_organizations_create } from "../../../generate/generate_random_hrm_time_track_member_organizations_create";
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";
import { prepare_random_hrm_time_track_organization } from "../../../prepare/prepare_random_hrm_time_track_organization";

/**
 * Test deleting a department that has employees assigned to it.
 *
 * Validates the department deletion workflow including member authentication, organization setup, department creation, and deletion operation. The test ensures that the department can be successfully deleted via the API endpoint.
 *
 * Note: Employee assignment validation is not included in this test as employee-related DTOs and API functions are not available in the current API specification.
 *
 * 1. Register and authenticate a new member account.
 * 2. Create an organization as the parent context for department operations.
 * 3. Create a department within the organization.
 * 4. Delete the department using the erase endpoint.
 * 5. Verify successful deletion (void response, no error thrown).
 */
export async function test_api_department_deletion_with_assigned_employees(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmTimeTrackMember.IJoin,
  });
  // 2. Create organization
  const organization: IHrmTimeTrackOrganization =
    await generate_random_hrm_time_track_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmTimeTrackOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Create department
  const department: IHrmTimeTrackDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 4. Delete department
  await api.functional.hrmTimeTrack.member.departments.erase(memberConnection, {
    departmentId: department.id,
  });
}
