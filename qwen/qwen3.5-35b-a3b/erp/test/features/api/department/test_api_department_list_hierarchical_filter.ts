import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import type { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import type { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import type { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import type { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_list_hierarchical_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member user
  const authConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(authConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmsMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Get organization from member's memberships
  const orgMembership = memberAuth.organization_memberships[0];
  typia.assert(orgMembership);
  const organizationId = orgMembership.organization.id;
  // 3. Create connection for member's authenticated requests
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = { ...connection.headers };
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 4. Test 1: Retrieve top-level departments (parent_id omitted)
  const topLevelResponse =
    await api.functional.hrms.member.organizations.departments.index(
      memberConnection,
      {
        organizationId: organizationId,
        body: {
          limit: 10,
        } satisfies IHrmsDepartment.IRequest,
      },
    );
  typia.assert(topLevelResponse);
  typia.assert(topLevelResponse.data);
  // Verify all top-level departments have parent IS NULL
  for (const dept of topLevelResponse.data) {
    typia.assert(dept);
    TestValidator.equals(
      "top-level department has null parent",
      dept.parent,
      null,
    );
  }
  // 5. Test 2: Find a parent department to use for child filtering
  let parentDepartment: IHrmsDepartment.ISummary | undefined;
  if (topLevelResponse.data.length > 0) {
    parentDepartment = topLevelResponse.data[0];
    typia.assert(parentDepartment);
    typia.assert(parentDepartment.id);
  }
  // 6. Test 3: Filter by parent_id to get child departments
  let childDepartments: IHrmsDepartment.ISummary[] = [];
  if (parentDepartment) {
    const childResponse =
      await api.functional.hrms.member.organizations.departments.index(
        memberConnection,
        {
          organizationId: organizationId,
          body: {
            parent_id: parentDepartment.id,
            limit: 10,
          } satisfies IHrmsDepartment.IRequest,
        },
      );
    typia.assert(childResponse);
    typia.assert(childResponse.data);
    childDepartments = childResponse.data;
    // Verify all child departments have correct parent reference
    for (const childDept of childDepartments) {
      typia.assert(childDept);
      TestValidator.equals(
        "child department parent matches filter",
        childDept.parent?.id,
        parentDepartment.id,
      );
      TestValidator.predicate(
        "child department parent is not null",
        childDept.parent !== null,
      );
    }
  }
  // 7. Test 4: Verify parent field is populated for child departments
  if (childDepartments.length > 0) {
    const firstChild = childDepartments[0];
    typia.assert(firstChild);
    typia.assert(firstChild.parent);
    TestValidator.equals(
      "parent field is populated for child department",
      firstChild.parent !== null,
      true,
    );
  }
  // 8. Validate pagination is working correctly
  TestValidator.equals(
    "pagination has valid records",
    topLevelResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has valid limit",
    topLevelResponse.pagination.limit >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has valid current page",
    topLevelResponse.pagination.current >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has valid pages count",
    topLevelResponse.pagination.pages >= 0,
    true,
  );
}