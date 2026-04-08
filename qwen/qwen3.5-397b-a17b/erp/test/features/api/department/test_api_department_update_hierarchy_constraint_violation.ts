import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_organizations_departments_create } from "../../../generate/generate_random_hrm_platform_member_organizations_departments_create";
import { prepare_random_hrm_platform_department } from "../../../prepare/prepare_random_hrm_platform_department";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

/**
 * Test department hierarchy constraint validation to ensure one-level nesting only.
 *
 * Validates that the system enforces a one-level department hierarchy constraint where a parent department cannot itself have a parent. This prevents circular references and deep nesting that would complicate organizational structure management.
 *
 * The test creates a two-tier department structure (A as top-level, B as child of A), then attempts to update department A to have B as its parent. This would create a circular hierarchy (A → B → A) which violates the business rule. The system must reject this update with an appropriate error response.
 *
 * 1. Member registers with unique credentials and authenticates.
 * 2. Creates an organization to establish context for department operations.
 * 3. Creates department A as a top-level department (no parent).
 * 4. Creates department B with department A as its parent.
 * 5. Attempts to update department A to have department B as parent (circular reference).
 * 6. Validates the update is rejected with appropriate error response.
 */
export async function test_api_department_update_hierarchy_constraint_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create department A as top-level (no parent)
  const departmentA =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: typia.random<string>(),
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(departmentA);
  // 4. Create department B with A as parent
  const departmentB =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: {
          name: typia.random<string>(),
          parentDepartmentId: departmentA.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(departmentB);
  // 5. Attempt to update department A to have B as parent (circular hierarchy)
  // This should be rejected as it would create A → B → A circular reference
  await TestValidator.error(
    "circular hierarchy violation rejected",
    async () => {
      await api.functional.hrmPlatform.member.organizations.departments.update(
        memberConnection,
        {
          organizationId: organization.id,
          departmentId: departmentA.id,
          body: {
            parentDepartmentId: departmentB.id,
          } satisfies IHrmPlatformDepartment.IUpdate,
        },
      );
    },
  );
}