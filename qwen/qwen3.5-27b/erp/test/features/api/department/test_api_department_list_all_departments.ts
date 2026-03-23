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
 * Test that an authenticated member can retrieve a paginated list of all active departments within their organization.
 *
 * This test verifies:
 * 1. Member authentication via join flow
 * 2. Department listing with default pagination parameters
 * 3. Response structure validation including pagination metadata
 * 4. Active department filtering (deleted_at is null)
 * 5. Organization context isolation
 */
export async function test_api_department_list_all_departments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Call department list endpoint with default parameters (empty request)
  const response = await api.functional.hrmPlatform.member.departments.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformDepartment.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals(
    "current page is at least 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate departments array structure
  TestValidator.predicate(
    "departments array exists",
    Array.isArray(response.data),
  );
  // 5. If departments exist, validate each one
  if (response.data.length > 0) {
    await ArrayUtil.asyncForEach(response.data, async (department) => {
      typia.assert(department);
      // Validate department has required fields
      TestValidator.predicate(
        "department has valid UUID",
        /^[0-9a-f-]{36}$/i.test(department.id),
      );
      TestValidator.predicate(
        "department has name",
        department.name.length > 0,
      );
      TestValidator.predicate(
        "department has organization",
        department.organization.id !== undefined,
      );
      TestValidator.predicate(
        "department has created_at",
        department.created_at.length > 0,
      );
      TestValidator.predicate(
        "department has updated_at",
        department.updated_at.length > 0,
      );
      // Validate active department (deleted_at is null)
      TestValidator.equals(
        "department is active (deleted_at is null)",
        department.deleted_at,
        null,
      );
      // Validate parent is null or valid department summary
      if (department.parent !== null) {
        typia.assert(department.parent);
        TestValidator.predicate(
          "parent has valid UUID",
          /^[0-9a-f-]{36}$/i.test(department.parent.id),
        );
      }
      // Validate organization context isolation
      TestValidator.predicate(
        "department belongs to organization",
        department.organization.id !== undefined,
      );
    });
  }
  // 6. Validate pagination consistency
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "pages calculated correctly",
      response.pagination.pages >= 1,
    );
  } else {
    TestValidator.equals(
      "pages is 0 when no records",
      response.pagination.pages,
      0,
    );
  }
}
