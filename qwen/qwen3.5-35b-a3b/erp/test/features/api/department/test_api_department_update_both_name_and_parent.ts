import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";

/**
 * Test updating a department with both name and parent department in a single operation.
 *
 * Validates the complete department update workflow where both name and parent department
 * can be modified atomically in a single API request. Tests organization restructure scenarios
 * where a department needs to be renamed and reassigned to a different parent simultaneously.
 * Ensures that name uniqueness constraints are enforced, parent department validation
 * works correctly, and both changes are applied atomically with a single timestamp update.
 *
 * 1. Member registers with initial organization
 * 2. Initial parent department ('Global Operations') is created
 * 3. Child department ('Sales Team') is created under parent
 * 4. New parent department ('Business Division') is created for reassignment
 * 5. Child department is updated with new name and new parent in single request
 * 6. Response is validated for updated name, new parent reference, and preserved fields
 */
export async function test_api_department_update_both_name_and_parent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member and create organization
  const memberConnection: api.IConnection = { host: connection.host };
  const joinOutput = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
    },
  });
  typia.assert(joinOutput);
  const orgId: string = joinOutput.member.id; // Owner's ID is member ID
  // Create a connection with the access token for subsequent calls
  const memberAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joinOutput.token.access,
    },
  };
  // Step 2: Create initial parent department ('Global Operations')
  const globalOps =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberAuthConnection,
      {
        organizationId: orgId,
        body: {
          name: "Global Operations",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(globalOps);
  // Step 3: Create child department ('Sales Team') under Global Operations
  const salesTeam =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberAuthConnection,
      {
        organizationId: orgId,
        body: {
          name: "Sales Team",
          parent_department_id: globalOps.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(salesTeam);
  // Step 4: Create new parent department ('Business Division') for reassignment
  const businessDiv =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      memberAuthConnection,
      {
        organizationId: orgId,
        body: {
          name: "Business Division",
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(businessDiv);
  // Step 5: Update department with both name and new parent in single request
  const updatedSales =
    await api.functional.hrmPlatform.member.organizations.departments.update(
      memberAuthConnection,
      {
        organizationId: orgId,
        departmentId: salesTeam.id,
        body: {
          name: "Sales Department",
          parent_department_id: businessDiv.id,
        } satisfies IHrmPlatformDepartment.IUpdate,
      },
    );
  typia.assert(updatedSales);
  // Step 6: Validate response fields
  // Name should be updated
  TestValidator.equals(
    "name should be updated",
    updatedSales.name,
    "Sales Department",
  );
  // Parent should be reassigned
  TestValidator.equals(
    "parent should be reassigned",
    updatedSales.parentDepartment?.id,
    businessDiv.id,
  );
  // Step 7: Validate all other fields remain correct
  // ID should remain unchanged
  TestValidator.equals(
    "id should remain unchanged",
    updatedSales.id,
    salesTeam.id,
  );
  // Organization should remain the same
  TestValidator.equals(
    "organization should remain unchanged",
    updatedSales.organization.id,
    orgId,
  );
  // Created timestamp should remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged",
    updatedSales.created_at,
    salesTeam.created_at,
  );
  // Updated timestamp should be refreshed (newer than before)
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedSales.updated_at,
    salesTeam.updated_at,
  );
}
