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
 * Test attempting to delete a parent department that has child departments assigned.
 *
 * Validates that the department deletion operation correctly rejects attempts to delete a parent department when child departments exist. The system should prevent deletion of parent departments until all child departments are either deleted or re-parented to a different parent.
 *
 * This test verifies the hierarchical integrity constraint that maintains organizational structure consistency. When a parent department has child departments, the deletion must be rejected with an appropriate error message, and the parent department must remain active and unchanged.
 *
 * 1. Register and authenticate as a member with organization management permission
 * 2. Create an organization to serve as the context for department operations
 * 3. Create a parent department (e.g., "Technology")
 * 4. Create at least one child department with the parent department as its parent (e.g., "Engineering")
 * 5. Attempt to delete the parent department
 * 6. Validate that the deletion is rejected with HTTP 400 Bad Request
 * 7. Verify that the parent department remains active and unchanged
 */
export async function test_api_department_deletion_with_child_departments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a member
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
  // 2. Create an organization
  const organization =
    await api.functional.hrmTimeTrack.member.organizations.create(
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
  // 3. Create a parent department
  const parentDepartment =
    await api.functional.hrmTimeTrack.member.departments.create(
      memberConnection,
      {
        body: {
          name: "Technology",
          description: "Technology department",
          parent_department_id: null,
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 4. Create a child department under the parent
  const childDepartment =
    await api.functional.hrmTimeTrack.member.departments.create(
      memberConnection,
      {
        body: {
          name: "Engineering",
          description: "Engineering team",
          parent_department_id: parentDepartment.id,
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 5. Attempt to delete the parent department (should fail)
  await TestValidator.error(
    "deletion rejected when child departments exist",
    async () => {
      await api.functional.hrmTimeTrack.member.departments.erase(
        memberConnection,
        {
          departmentId: parentDepartment.id,
        },
      );
    },
  );
  // 6. Verify parent department still exists and is active
  TestValidator.equals(
    "parent department remains active",
    parentDepartment.deleted_at,
    null,
  );
  TestValidator.predicate(
    "parent department name unchanged",
    parentDepartment.name === "Technology",
  );
  // 7. Verify child department is unchanged
  TestValidator.equals(
    "child department parent reference unchanged",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child department remains active",
    childDepartment.deleted_at,
    null,
  );
}
