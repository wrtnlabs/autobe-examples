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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_admin_departments_create } from "../../../generate/generate_random_erp_hrm_admin_departments_create";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_department } from "../../../prepare/prepare_random_erp_hrm_department";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_department_retrieval_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and login
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create organization
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {},
  );
  typia.assert(organization);
  // 3. Create member account and login
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  await authorize_member_login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: "password",
      href: "http://localhost",
      referrer: "http://localhost",
    },
  });
  // 4. Create parent department
  const parentDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Parent Department " + RandomGenerator.alphabets(5),
        description: "This is a parent department for hierarchy testing",
      },
    });
  typia.assert(parentDepartment);
  // 5. Create child department with parentId
  const childDepartment =
    await generate_random_erp_hrm_admin_departments_create(adminConnection, {
      body: {
        name: "Child Department " + RandomGenerator.alphabets(5),
        description: "This is a child department under parent",
        parentId: parentDepartment.id,
      },
    });
  typia.assert(childDepartment);
  // 6. Retrieve the child department using member endpoint
  const retrievedDepartment = await api.functional.erpHrm.member.departments.at(
    memberConnection,
    {
      departmentId: childDepartment.id,
    },
  );
  typia.assert(retrievedDepartment);
  // 7. Validate the response structure
  TestValidator.equals(
    "department id matches",
    retrievedDepartment.id,
    childDepartment.id,
  );
  TestValidator.equals(
    "department name matches",
    retrievedDepartment.name,
    childDepartment.name,
  );
  TestValidator.equals(
    "department description matches",
    retrievedDepartment.description,
    childDepartment.description,
  );
  // 8. Validate parent department exists in response
  TestValidator.predicate(
    "parent department exists",
    retrievedDepartment.parent !== null,
  );
  if (retrievedDepartment.parent) {
    TestValidator.equals(
      "parent id matches",
      retrievedDepartment.parent.id,
      parentDepartment.id,
    );
    TestValidator.equals(
      "parent name matches",
      retrievedDepartment.parent.name,
      parentDepartment.name,
    );
    TestValidator.equals(
      "parent description matches",
      retrievedDepartment.parent.description,
      parentDepartment.parent?.description,
    );
    // 9. Validate parent does NOT contain children array (prevents circular reference)
    TestValidator.predicate(
      "parent does not have children property",
      !("children" in retrievedDepartment.parent),
    );
    TestValidator.predicate(
      "parent has no nested parent (prevents circular)",
      retrievedDepartment.parent.parent === null,
    );
  }
}
