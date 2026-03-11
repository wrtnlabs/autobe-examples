import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_administrator_assignments_by_members_pagination_and_oversight(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Test pagination with different limit values
  const limitValues = [1, 5, 10, 50, 100] as const;
  for (const limit of limitValues) {
    const request = {
      page: 1,
      limit: limit satisfies number as number,
    } satisfies IDiscussionBoardAdministratorAssignment.IRequest;
    const response =
      await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
        superAdminConnection,
        { body: request },
      );
    typia.assert(response);
    // Validate pagination metadata
    TestValidator.equals(
      `limit ${limit} is respected`,
      response.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `current page is 1 for limit ${limit}`,
      response.pagination.current,
      1,
    );
    TestValidator.predicate(
      `total records is non-negative for limit ${limit}`,
      response.pagination.records >= 0,
    );
    // Correct pagination calculation
    const expectedPages =
      response.pagination.records === 0
        ? 0
        : Math.ceil(response.pagination.records / limit);
    TestValidator.equals(
      `total pages is correctly calculated for limit ${limit}`,
      response.pagination.pages,
      expectedPages,
    );
    // Validate data array size does not exceed limit
    TestValidator.predicate(
      `data array size <= limit ${limit}`,
      response.data.length <= limit,
    );
  }
  // Test edge case: page beyond total pages
  const largePageRequest = {
    page: 9999,
    limit: 10,
  } satisfies IDiscussionBoardAdministratorAssignment.IRequest;
  const largePageResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      { body: largePageRequest },
    );
  typia.assert(largePageResponse);
  // Page beyond total pages should return empty data array
  if (
    largePageResponse.pagination.current > largePageResponse.pagination.pages
  ) {
    TestValidator.equals(
      "page beyond total pages returns empty data",
      largePageResponse.data.length,
      0,
    );
  }
  // Test very small limit
  const smallLimitRequest = {
    page: 1,
    limit: 1,
  } satisfies IDiscussionBoardAdministratorAssignment.IRequest;
  const smallLimitResponse =
    await api.functional.discussionBoard.superAdmin.administrator_assignments.by_members.index(
      superAdminConnection,
      { body: smallLimitRequest },
    );
  typia.assert(smallLimitResponse);
  TestValidator.equals(
    "small limit of 1 returns at most 1 item",
    smallLimitResponse.data.length <= 1,
    true,
  );
  // Validate assignment record structure for oversight
  if (smallLimitResponse.data.length > 0) {
    const assignment = smallLimitResponse.data[0];
    // Validate essential fields for governance oversight
    TestValidator.predicate(
      "assignment has valid UUID",
      typeof assignment.id === "string" && assignment.id.length > 0,
    );
    TestValidator.predicate(
      "assignment has old_role field",
      typeof assignment.old_role === "string" && assignment.old_role.length > 0,
    );
    TestValidator.predicate(
      "assignment has new_role field",
      typeof assignment.new_role === "string" && assignment.new_role.length > 0,
    );
    TestValidator.predicate(
      "assignment has assignment_type field",
      typeof assignment.assignment_type === "string" &&
        assignment.assignment_type.length > 0,
    );
    TestValidator.predicate(
      "assignment has created_at timestamp",
      typeof assignment.created_at === "string" &&
        assignment.created_at.length > 0,
    );
    // Validate nullable reason field
    if (assignment.reason !== null) {
      TestValidator.predicate(
        "assignment reason is string when not null",
        typeof assignment.reason === "string",
      );
    }
  }
}
