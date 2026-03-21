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
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_department_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as a member (owner gets org:manage permission)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create a department to update
  const createdDepartment =
    await generate_random_erp_hrm_member_departments_create(memberConnection, {
      body: {
        name: "Engineering",
        description: "Technical department",
      },
    });
  typia.assert(createdDepartment);
  // Store original values for comparison
  const originalId = createdDepartment.id;
  const originalOrganization = createdDepartment.organization;
  const originalParent = createdDepartment.parent;
  const originalCreatedAt = createdDepartment.created_at;
  // Step 3: Update the department with new name and description
  const updatedDepartment =
    await api.functional.erpHrm.member.departments.update(memberConnection, {
      departmentId: createdDepartment.id,
      body: {
        name: "Engineering Team",
        description: "Software Engineering Department",
      } satisfies IErpHrmDepartment.IUpdate,
    });
  typia.assert(updatedDepartment);
  // Validations
  TestValidator.equals("id unchanged", updatedDepartment.id, originalId);
  TestValidator.equals(
    "name updated",
    updatedDepartment.name,
    "Engineering Team",
  );
  TestValidator.equals(
    "description updated",
    updatedDepartment.description,
    "Software Engineering Department",
  );
  TestValidator.equals(
    "organization unchanged",
    updatedDepartment.organization.id,
    originalOrganization.id,
  );
  TestValidator.equals(
    "parent unchanged",
    updatedDepartment.parent,
    originalParent,
  );
  TestValidator.predicate(
    "updated_at greater than created_at",
    new Date(updatedDepartment.updated_at).getTime() >=
      new Date(originalCreatedAt).getTime(),
  );
}
