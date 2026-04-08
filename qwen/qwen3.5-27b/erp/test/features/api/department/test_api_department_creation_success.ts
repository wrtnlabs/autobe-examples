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
 * Test the primary success path for creating a new department within an organization.
 *
 * Validates the complete department creation flow including member authentication and department establishment. Ensures that the department is correctly created with provided name and description, and that top-level departments have no parent reference.
 *
 * Special attention is given to verifying that the department name and description match the input values, that the parent department is null for top-level departments, and that the organization context is correctly associated.
 *
 * 1. Member registers and authenticates with organization management permissions.
 * 2. Member creates a new top-level department with name and description.
 * 3. Validates department details match input and structure is correct.
 */
export async function test_api_department_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
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
  // 2. Create department with specific name and description
  const department =
    await generate_random_hrm_time_track_member_departments_create(
      memberConnection,
      {
        body: {
          name: "Engineering",
          description: "Software development team",
          parent_department_id: null,
        } satisfies IHrmTimeTrackDepartment.ICreate,
      },
    );
  typia.assert(department);
  // 3. Validate department creation
  TestValidator.equals(
    "department name matches input",
    department.name,
    "Engineering",
  );
  TestValidator.equals(
    "department description matches input",
    department.description,
    "Software development team",
  );
  TestValidator.equals(
    "parent department is null",
    department.parentDepartment,
    null,
  );
  TestValidator.predicate(
    "organization is present",
    department.organization.id !== undefined,
  );
  TestValidator.predicate(
    "created_at is present",
    department.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    department.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", department.deleted_at, null);
}
