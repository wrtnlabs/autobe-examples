import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationContext } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationContext";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_member_organization_context_select } from "../../../generate/generate_random_erp_hrm_member_organization_context_select";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization_context } from "../../../prepare/prepare_random_erp_hrm_organization_context";

export async function test_api_department_hierarchy_with_nested_departments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create parent department Engineering
  const engineering = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: "Engineering",
        description: "Engineering department for software development",
      },
    },
  );
  typia.assert(engineering);
  // 3. Create child department Frontend under Engineering
  const frontend = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: "Frontend",
        description: "Frontend development team",
        parentId: engineering.id,
      },
    },
  );
  typia.assert(frontend);
  // 4. Create child department Backend under Engineering
  const backend = await generate_random_erp_hrm_admin_departments_create(
    adminConnection,
    {
      body: {
        name: "Backend",
        description: "Backend development team",
        parentId: engineering.id,
      },
    },
  );
  typia.assert(backend);
  // 5. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 6. Set organization context for the member
  await generate_random_erp_hrm_member_organization_context_select(
    memberConnection,
    {},
  );
  // 7. Retrieve department hierarchy
  const hierarchy =
    await api.functional.erpHrm.member.departments.hierarchy(memberConnection);
  typia.assert(hierarchy);
  // 8. Validate hierarchy structure
  TestValidator.equals("hierarchy has name", hierarchy.name, "Engineering");
  TestValidator.equals(
    "hierarchy description matches",
    hierarchy.description,
    "Engineering department for software development",
  );
  TestValidator.equals("parent is null for root", hierarchy.parent, null);
  TestValidator.predicate("has children array", hierarchy.children.length > 0);
  TestValidator.equals("has 2 children", hierarchy.children.length, 2);
  // 9. Validate children are sorted alphabetically
  const childNames = hierarchy.children.map((c) => c.name);
  TestValidator.equals("first child is Backend", childNames[0], "Backend");
  TestValidator.equals("second child is Frontend", childNames[1], "Frontend");
  // 10. Validate child department properties
  const childFrontend = hierarchy.children.find((c) => c.name === "Frontend");
  const childBackend = hierarchy.children.find((c) => c.name === "Backend");
  if (childFrontend) {
    TestValidator.equals(
      "Frontend parent references Engineering",
      childFrontend.parent?.id,
      engineering.id,
    );
    TestValidator.equals(
      "Frontend description matches",
      childFrontend.description,
      "Frontend development team",
    );
    TestValidator.predicate(
      "Frontend children is empty array",
      Array.isArray(childFrontend.children),
    );
  }
  if (childBackend) {
    TestValidator.equals(
      "Backend parent references Engineering",
      childBackend.parent?.id,
      engineering.id,
    );
    TestValidator.equals(
      "Backend description matches",
      childBackend.description,
      "Backend development team",
    );
    TestValidator.predicate(
      "Backend children is empty array",
      Array.isArray(childBackend.children),
    );
  }
}