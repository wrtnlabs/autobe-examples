import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_departments_create } from "../../../generate/generate_random_erp_hrm_member_departments_create";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_create_with_parent_nesting(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Setup: Create organization context
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // Setup: Create top-level parent department (no parent)
  const parentDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: "Engineering",
        description: "Engineering department",
        parentDepartmentId: null,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(parentDepartment);
  // Verify parent is top-level
  TestValidator.equals(
    "parent department is top-level",
    parentDepartment.parentDepartment,
    null,
  );
  // Test: Create child department with parent reference
  const childDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: "Frontend Development",
        description: "Frontend engineering team",
        parentDepartmentId: parentDepartment.id,
      } satisfies IErpHrmDepartment.ICreate,
    });
  typia.assert(childDepartment);
  // Validation: Child has correct parent reference
  TestValidator.equals(
    "child department parent ID matches",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  // Validation: Parent in child response is top-level (single-level nesting)
  TestValidator.equals(
    "parent department has no parent (top-level)",
    childDepartment.parentDepartment?.parentDepartment,
    null,
  );
  // Validation: Organization context preserved
  TestValidator.equals(
    "child department belongs to same organization",
    childDepartment.organization.id,
    organization.id,
  );
  // Validation: Timestamps are present
  TestValidator.predicate(
    "createdAt is valid timestamp",
    !!childDepartment.createdAt,
  );
  TestValidator.predicate(
    "updatedAt is valid timestamp",
    !!childDepartment.updatedAt,
  );
}
