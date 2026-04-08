import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";

export async function test_api_department_creation_with_full_attributes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and establish authenticated session
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent department first
  const parentDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    });
  typia.assert(parentDepartment);
  // 3. Create child department with parent reference
  const childDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        parentId: parentDepartment.id,
      },
    });
  typia.assert(childDepartment);
  // 4. Validate response includes all provided fields
  TestValidator.equals(
    "department has name",
    childDepartment.name.length > 0,
    true,
  );
  TestValidator.equals(
    "department has description",
    childDepartment.description !== undefined,
    true,
  );
  TestValidator.equals(
    "department belongs to organization",
    childDepartment.organization !== undefined,
    true,
  );
  // 5. Validate parent department is properly linked in the response
  TestValidator.notEquals("parent is not null", childDepartment.parent, null);
  if (childDepartment.parent) {
    TestValidator.equals(
      "parent ID matches",
      childDepartment.parent.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent name matches",
      childDepartment.parent.name,
      parentDepartment.name,
    );
  }
}
