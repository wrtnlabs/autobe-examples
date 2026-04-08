import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_filter_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  memberConnection.headers!.Authorization = authorized.token.access;
  // 2. Get all departments first to discover existing departments with parent relationships
  const allDepartments = await api.functional.erpHrm.member.departments.index(
    memberConnection,
    {
      body: {} satisfies IErpHrmDepartment.IRequest,
    },
  );
  typia.assert(allDepartments);
  // 3. Find a department that has a parent (to get a valid parentId for filtering)
  const departmentWithParent = allDepartments.data.find(
    (dept) => dept.parent !== null && dept.parent !== undefined,
  );
  // 4. Filter departments by parent ID
  if (departmentWithParent && departmentWithParent.parent) {
    const parentId = departmentWithParent.parent.id;
    // 5. Call PATCH /erpHrm/member/departments with parentId filter
    const filteredDepartments =
      await api.functional.erpHrm.member.departments.index(memberConnection, {
        body: {
          parentId: parentId,
        } satisfies IErpHrmDepartment.IRequest,
      });
    typia.assert(filteredDepartments);
    // 6. Verify response returns only departments that have the specified parent
    TestValidator.predicate(
      "filtered departments should have at least one result",
      filteredDepartments.data.length > 0,
    );
    // 7. Verify each returned department's parent.id matches the filter parentId
    for (const dept of filteredDepartments.data) {
      TestValidator.equals(
        "department parent ID should match filter",
        dept.parent?.id,
        parentId,
      );
    }
    // 8. Verify child departments are included while top-level departments are excluded
    // All filtered departments must have a non-null parent
    for (const dept of filteredDepartments.data) {
      TestValidator.predicate(
        "filtered department should have a parent",
        dept.parent !== null && dept.parent !== undefined,
      );
    }
  }
}
