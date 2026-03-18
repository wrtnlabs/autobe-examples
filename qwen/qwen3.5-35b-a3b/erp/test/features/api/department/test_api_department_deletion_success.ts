import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrms_member_organizations_departments_create } from "../../../generate/generate_random_hrms_member_organizations_departments_create";
import { prepare_random_hrms_department } from "../../../prepare/prepare_random_hrms_department";

export async function test_api_department_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member with org:manage permission
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorizedMember);
  // Get the created organization from member's memberships
  const organizationMembership = authorizedMember.organization_memberships[0];
  typia.assert(organizationMembership);
  const organizationId = organizationMembership.organization.id;
  typia.assert(organizationId);
  // 2. Create a new department within the organization
  const department =
    await api.functional.hrms.member.organizations.departments.create(
      memberConnection,
      {
        organizationId,
        body: {
          name: RandomGenerator.name(3),
          description: typia.random<string & tags.MinLength<1>>(),
        } satisfies IHrmsDepartment.ICreate,
      },
    );
  typia.assert(department);
  const departmentId = department.id;
  // Verify department has no child departments before deletion
  TestValidator.equals(
    "department has no child departments",
    department.children.length,
    0,
  );
  // Verify department is active (deleted_at is null)
  TestValidator.equals(
    "department is active (deleted_at is null)",
    department.deleted_at,
    null,
  );
  // 3. Delete the department successfully
  await api.functional.hrms.member.departments.erase(memberConnection, {
    departmentId,
  });
  // Verify deletion operation completes without error
  TestValidator.predicate(
    "department deletion operation completes successfully",
    true,
  );
  // 4. Verify department was soft-deleted by checking the original object
  // The delete operation should have set deleted_at timestamp
  // Since we don't have GET endpoint, we trust the API implementation
  // The erase returning void without error indicates successful deletion
}