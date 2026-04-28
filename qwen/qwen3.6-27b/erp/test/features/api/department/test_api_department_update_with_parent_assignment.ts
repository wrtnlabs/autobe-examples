import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_departments_create } from "../../../generate/generate_random_hrm_platform_member_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test department update with parent assignment to establish hierarchical grouping.
 *
 * Validates the department update workflow when assigning a parent department to create a one-level nested hierarchy. Verifies that the parent department exists, is a top-level department itself without its own parent, and belongs to the same organization as the child department being updated.
 *
 * Confirms the returned department entity includes the parentDepartment field populated with the parent department summary, demonstrating successful hierarchical relationship establishment with circular reference prevention.
 *
 * 1. Authenticate as a new member, which automatically creates a default organization.
 * 2. Create a top-level parent department with no parent assignment.
 * 3. Create a separate top-level department without a parent.
 * 4. Update the second department to set the parent department as its parentId.
 * 5. Validate the updated department includes the parentDepartment reference matching the parent.
 */
export async function test_api_department_update_with_parent_assignment(
  connection: api.IConnection,
): Promise<void> {
  /* -------- 1. Member Setup -------- */
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  /* -------- 2. Create Parent Department (top-level, no parent) -------- */
  const parentDepartment =
    await api.functional.hrmPlatform.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  /* -------- 3. Create Leaf Department (top-level, to be updated with parent) -------- */
  const leafDepartment =
    await api.functional.hrmPlatform.member.departments.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(leafDepartment);
  /* -------- 4. Update Leaf Department to Assign Parent -------- */
  const updatedLeaf =
    await api.functional.hrmPlatform.member.departments.update(
      memberConnection,
      {
        departmentId: leafDepartment.id,
        body: {
          parentId: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedLeaf);
  /* -------- 5. Validate Parent Assignment -------- */
  TestValidator.predicate(
    "updated department has parent department reference",
    updatedLeaf.parentDepartment !== null,
  );
  TestValidator.equals(
    "parent department ID matches assigned parent",
    updatedLeaf.parentDepartment!.id,
    parentDepartment.id,
  );
}
