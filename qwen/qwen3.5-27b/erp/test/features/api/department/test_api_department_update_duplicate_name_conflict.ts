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
import { prepare_random_hrm_time_track_department } from "../../../prepare/prepare_random_hrm_time_track_department";

/**
 * Test department update with duplicate name validation.
 *
 * Validates the complete department update flow including member authentication, department creation, and duplicate name conflict handling. Ensures that attempting to update a department with a name that already exists in the same organization returns a 409 Conflict error and that the original department data remains unchanged.
 *
 * Special attention is given to verifying that the duplicate name validation works correctly and that failed updates do not modify the existing department data.
 *
 * 1. Authenticate as a member with organization management permissions.
 * 2. Create first department with name 'Sales'.
 * 3. Create second department with name 'Marketing'.
 * 4. Attempt to update the second department with name 'Sales' (duplicate).
 * 5. Verify the update fails with 409 Conflict error.
 * 6. Verify the second department's name remains unchanged after failed update.
 */
export async function test_api_department_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
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
  // 2. Create first department with name 'Sales'
  const firstDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Sales",
          description: "Sales department",
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(firstDepartment);
  // 3. Create second department with name 'Marketing'
  const secondDepartment =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Marketing",
          description: "Marketing department",
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(secondDepartment);
  // 4. Attempt to update second department with duplicate name 'Sales'
  await TestValidator.httpError(
    "duplicate name should return 409 Conflict",
    409,
    async () => {
      await api.functional.hrmTimeTrack.member.departments.update(
        memberConnection,
        {
          departmentId: secondDepartment.id,
          body: {
            name: "Sales",
            description: "Updated sales team",
          } satisfies IHrmTimeTrackDepartment.IUpdate,
        },
      );
    },
  );
  // 5. Verify second department's name remains unchanged
  const updatedSecondDepartment =
    await api.functional.hrmTimeTrack.member.departments.update(
      memberConnection,
      {
        departmentId: secondDepartment.id,
        body: {
          description: "Updated marketing team",
        } satisfies IHrmTimeTrackDepartment.IUpdate,
      },
    );
  typia.assert(updatedSecondDepartment);
  TestValidator.equals(
    "second department name unchanged after failed update",
    updatedSecondDepartment.name,
    "Marketing",
  );
  TestValidator.equals(
    "first department still exists",
    firstDepartment.name,
    "Sales",
  );
}
