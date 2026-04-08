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
 * Test creating a hierarchical department with parent reference.
 *
 * Validates the complete department creation workflow with hierarchical
 * structure. Registers a new member account which creates an organization,
 * then creates a parent department at the root level, and finally creates
 * a child department that references the parent. Ensures that the
 * organization relationship is correctly maintained and the parent-child
 * hierarchy is properly established.
 *
 * Special attention is given to verifying that the parentDepartment field
 * in the child department response correctly references the parent
 * department, and that both departments belong to the same organization.
 *
 * 1. Member registration with organization creation using POST /hrmPlatform/auth/member/join.
 * 2. Parent department creation with null parent_department_id.
 * 3. Child department creation with parent_department_id reference.
 * 4. Validate hierarchical structure and organization consistency.
 */
export async function test_api_department_create_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account (creates organization)
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"] as const),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ] as const),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]) satisfies number,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(joinResult);
  const organizationId = joinResult.member.id;
  // 2. Create parent department
  const parentConnection: api.IConnection = { host: connection.host };
  parentConnection.headers = { Authorization: joinResult.token.access };
  const parentDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      parentConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          parent_department_id: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  const parentDepartmentId = parentDepartment.id;
  // 3. Create child department with parent reference
  const childConnection: api.IConnection = { host: connection.host };
  childConnection.headers = { Authorization: joinResult.token.access };
  const childDepartment =
    await api.functional.hrmPlatform.member.organizations.departments.create(
      childConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(),
          parent_department_id: parentDepartmentId,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 4. Validate hierarchical structure
  TestValidator.equals(
    "parent department ID matches",
    childDepartment.parentDepartment?.id,
    parentDepartmentId,
  );
  TestValidator.equals(
    "parent department name matches",
    childDepartment.parentDepartment?.name,
    parentDepartment.name,
  );
  TestValidator.equals(
    "organization matches",
    childDepartment.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "parent organization matches",
    parentDepartment.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "organization consistency",
    childDepartment.organization.id,
    parentDepartment.organization.id,
  );
  TestValidator.predicate(
    "soft delete initialized correctly",
    childDepartment.deleted_at === null,
  );
  TestValidator.predicate(
    "parent soft delete initialized correctly",
    parentDepartment.deleted_at === null,
  );
}
