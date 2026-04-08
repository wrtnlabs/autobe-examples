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
 * Test department creation with parent-child hierarchy within an organization.
 *
 * Validates the complete department hierarchy workflow including member authentication, organization creation, parent department establishment, and child department creation with proper parent reference. Ensures that the one-level department nesting (parent-child relationship) is correctly maintained and that the parentDepartment field accurately reflects the hierarchical relationship.
 *
 * Special attention is given to verifying that the child department's parentDepartmentId correctly references the parent department and that the returned parentDepartment summary contains matching identifier and name data.
 *
 * 1. Member authenticates via join endpoint to obtain authorization tokens.
 * 2. Organization is created as the container for department hierarchy.
 * 3. Parent department is created at top level (no parent reference).
 * 4. Child department is created with parentDepartmentId referencing parent.
 * 5. Validates child department's parentDepartment field matches parent data.
 * 6. Verifies both departments have correct hierarchy structure and are accessible.
 */
export async function test_api_department_creation_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create organization
  const organization: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Create parent department (top-level, no parent)
  const parentDepartment: IHrmPlatformDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: typia.random<string>(),
          parentDepartmentId: null,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(parentDepartment);
  // 4. Create child department with parent reference
  const childDepartment: IHrmPlatformDepartment =
    await generate_random_hrm_platform_member_organizations_departments_create(
      memberConnection,
      {
        params: {
          organizationId: organization.id,
        },
        body: {
          name: typia.random<string>(),
          parentDepartmentId: parentDepartment.id,
        } satisfies IHrmPlatformDepartment.ICreate,
      },
    );
  typia.assert(childDepartment);
  // 5. Validate hierarchy relationship
  TestValidator.equals(
    "child parentDepartmentId matches parent id",
    childDepartment.parentDepartment?.id,
    parentDepartment.id,
  );
  TestValidator.equals(
    "child parentDepartment name matches parent name",
    childDepartment.parentDepartment?.name,
    parentDepartment.name,
  );
  // 6. Verify parent department has no parent (top-level)
  TestValidator.predicate(
    "parent department is top-level (no parent)",
    parentDepartment.parentDepartment === null,
  );
}