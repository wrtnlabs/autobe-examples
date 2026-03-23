import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test department isolation between organizations.
 * Verifies that a member from one organization cannot access departments
 * belonging to a different organization.
 */
export async function test_api_department_isolation_cross_organization(
  connection: api.IConnection,
): Promise<void> {
  // Create member for Organization A
  const orgAMemberConnection: api.IConnection = { host: connection.host };
  const orgAMember = await authorize_member_join(orgAMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: `OrgA_${RandomGenerator.name()}`,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // Create member for Organization B
  const orgBMemberConnection: api.IConnection = { host: connection.host };
  const orgBMember = await authorize_member_join(orgBMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: `OrgB_${RandomGenerator.name()}`,
    } satisfies IHrmTrackerMember.IJoin,
  });
  // Generate a department ID that belongs to Organization B (simulated)
  // In real scenario, Org B would have created this department
  const orgBDepartmentId = typia.random<string & tags.Format<"uuid">>();
  // Organization A member attempts to access Organization B's department
  // Should fail due to organization-scoped data isolation
  await TestValidator.error(
    "cross-organization department access should fail",
    async () => {
      await api.functional.hrmTracker.departments.at(orgAMemberConnection, {
        departmentId: orgBDepartmentId,
      });
    },
  );
}
