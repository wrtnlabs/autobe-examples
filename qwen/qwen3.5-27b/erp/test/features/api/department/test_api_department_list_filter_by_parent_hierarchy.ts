import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that departments can be filtered by parent-child hierarchy relationships using the parentId parameter.
 *
 * This test validates:
 * 1. Filtering departments by parentId=null returns only top-level departments
 * 2. Filtering departments by parentId=<uuid> returns only direct child departments
 * 3. Parent-child relationships are correctly represented in the response
 * 4. One-level nesting constraint (child departments cannot have their own children)
 */
export async function test_api_department_list_filter_by_parent_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(memberAuth);
  // Note: This test assumes departments already exist in the organization
  // Since there's no department creation API available in the provided SDK functions,
  // we'll test the filtering functionality with existing departments
  // 2. Test filtering with parentId=null (top-level departments only)
  const topLevelResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parentId: null,
          page: 1,
          limit: 100,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(topLevelResult);
  // Validate that all returned departments have parent=null
  for (const dept of topLevelResult.data) {
    TestValidator.equals(
      `department ${dept.id} should have null parent`,
      dept.parent,
      null,
    );
  }
  // 3. If we have top-level departments, test child filtering
  if (topLevelResult.data.length > 0) {
    const parentDept = topLevelResult.data[0];
    // Test filtering with parentId=<parent-department-id>
    const childResult =
      await api.functional.hrmPlatform.member.departments.index(
        memberConnection,
        {
          body: {
            parentId: parentDept.id,
            page: 1,
            limit: 100,
          } satisfies IHrmPlatformDepartment.IRequest,
        },
      );
    typia.assert(childResult);
    // Validate that all returned departments have the correct parent
    for (const childDept of childResult.data) {
      TestValidator.equals(
        `child department ${childDept.id} should have correct parent`,
        childDept.parent?.id,
        parentDept.id,
      );
      TestValidator.equals(
        `child department ${childDept.id} parent name should match`,
        childDept.parent?.name,
        parentDept.name,
      );
    }
    // Validate that child departments don't have their own children
    // (one-level nesting constraint)
    if (childResult.data.length > 0) {
      const childDept = childResult.data[0];
      const grandchildResult =
        await api.functional.hrmPlatform.member.departments.index(
          memberConnection,
          {
            body: {
              parentId: childDept.id,
              page: 1,
              limit: 100,
            } satisfies IHrmPlatformDepartment.IRequest,
          },
        );
      typia.assert(grandchildResult);
      // Should return empty (no grandchildren allowed)
      TestValidator.equals(
        `child department ${childDept.id} should have no children (one-level nesting)`,
        grandchildResult.data.length,
        0,
      );
    }
  }
  // 4. Test pagination with filtered results
  const paginatedResult =
    await api.functional.hrmPlatform.member.departments.index(
      memberConnection,
      {
        body: {
          parentId: null,
          page: 1,
          limit: 10,
        } satisfies IHrmPlatformDepartment.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination should return correct limit",
    paginatedResult.data.length <= 10,
  );
  TestValidator.equals(
    "pagination current page should be 1",
    paginatedResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    paginatedResult.pagination.limit,
    10,
  );
}
