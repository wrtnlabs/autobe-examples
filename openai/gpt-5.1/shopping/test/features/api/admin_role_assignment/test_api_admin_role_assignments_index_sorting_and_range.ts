import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRoleAssignment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallAdminRoleAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRoleAssignment";

export async function test_api_admin_role_assignments_index_sorting_and_range(
  connection: api.IConnection,
) {
  // 1. Register an admin and obtain authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an admin role and capture its code
  const roleBody = {
    code: `role_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleBody,
    });
  typia.assert<IShoppingMallAdminRole>(createdRole);

  const adminRoleCode: string = createdRole.code;

  // 3. Create multiple admins and assignments for that role
  const assignmentAdmins: IShoppingMallAdmin.IAuthorized[] = [];
  const assignmentIds: string[] = [];
  const createdAtList: string[] = [];

  const assignmentCount = 3;

  for (let i = 0; i < assignmentCount; i++) {
    const joinAssignmentBody = {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      ip: null,
      href: "https://admin.example.com/join-assignment",
      referrer: "https://admin.example.com/landing-assignment",
    } satisfies IShoppingMallAdminJoin.ICreate;

    const assignee: IShoppingMallAdmin.IAuthorized =
      await api.functional.auth.admin.join(connection, {
        body: joinAssignmentBody,
      });
    typia.assert<IShoppingMallAdmin.IAuthorized>(assignee);
    assignmentAdmins.push(assignee);

    const createAssignmentBody = {
      admin_id: assignee.id,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IShoppingMallAdminRoleAssignment.ICreate;

    const assignment: IShoppingMallAdminRoleAssignment =
      await api.functional.shoppingMall.admin.adminRoles.assignments.create(
        connection,
        {
          adminRoleCode,
          body: createAssignmentBody,
        },
      );
    typia.assert<IShoppingMallAdminRoleAssignment>(assignment);

    assignmentIds.push(assignment.id);
    createdAtList.push(assignment.created_at);

    // Small delay to help ensure different created_at ordering where backend uses timestamps
    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  // Sanity check that we created the expected number of assignments
  TestValidator.equals(
    "created assignment count matches",
    assignmentIds.length,
    assignmentCount,
  );

  // Helper to assert descending order by created_at
  const assertDescOrder = (
    items: IShoppingMallAdminRoleAssignment.ISummary[],
  ) => {
    for (let i = 1; i < items.length; i++) {
      const prev = new Date(items[i - 1].created_at).getTime();
      const curr = new Date(items[i].created_at).getTime();
      TestValidator.predicate(
        `created_at[${i - 1}] >= created_at[${i}] in desc order`,
        prev >= curr,
      );
    }
  };

  // Helper to assert ascending order by created_at
  const assertAscOrder = (
    items: IShoppingMallAdminRoleAssignment.ISummary[],
  ) => {
    for (let i = 1; i < items.length; i++) {
      const prev = new Date(items[i - 1].created_at).getTime();
      const curr = new Date(items[i].created_at).getTime();
      TestValidator.predicate(
        `created_at[${i - 1}] <= created_at[${i}] in asc order`,
        prev <= curr,
      );
    }
  };

  // 4. Call index sorted by created_at desc
  const descRequestBody = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const descPage: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode,
        body: descRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(descPage);

  const descData = descPage.data;

  // Confirm all returned assignments are for the expected role and admins
  for (const summary of descData) {
    typia.assert<IShoppingMallAdminRoleAssignment.ISummary>(summary);
    TestValidator.equals(
      "role code in summary matches created role",
      summary.role.code,
      adminRoleCode,
    );
  }

  // Ensure at least the assignments we created exist in the result set
  const returnedIdsDesc = descData.map((s) => s.id);
  for (const id of assignmentIds) {
    TestValidator.predicate(
      `assignment ${id} should be present in desc result`,
      returnedIdsDesc.includes(id),
    );
  }

  // Validate descending order by created_at
  assertDescOrder(descData);

  // Validate pagination metadata
  const paginationDesc = descPage.pagination;
  TestValidator.equals(
    "desc page current index is 0",
    paginationDesc.current,
    0,
  );
  TestValidator.equals(
    "desc page limit matches request",
    paginationDesc.limit,
    descRequestBody.limit,
  );
  TestValidator.predicate(
    "desc page records >= number of returned items",
    paginationDesc.records >= descData.length,
  );

  // 5. Call index sorted by created_at asc and verify reversed order
  const ascRequestBody = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const ascPage: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode,
        body: ascRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(ascPage);

  const ascData = ascPage.data;

  // Ensure same role code and presence of created ids
  for (const summary of ascData) {
    TestValidator.equals(
      "role code in asc summary matches created role",
      summary.role.code,
      adminRoleCode,
    );
  }

  const returnedIdsAsc = ascData.map((s) => s.id);
  for (const id of assignmentIds) {
    TestValidator.predicate(
      `assignment ${id} should be present in asc result`,
      returnedIdsAsc.includes(id),
    );
  }

  // Validate ascending order by created_at
  assertAscOrder(ascData);

  // Check that the global ordering of ids is reversed between desc and asc for at least our created assignments
  const filteredDescForCreated = descData.filter((s) =>
    assignmentIds.includes(s.id),
  );
  const filteredAscForCreated = ascData.filter((s) =>
    assignmentIds.includes(s.id),
  );

  TestValidator.equals(
    "number of created assignments in desc vs asc views is equal",
    filteredDescForCreated.length,
    filteredAscForCreated.length,
  );

  if (filteredDescForCreated.length >= 2 && filteredAscForCreated.length >= 2) {
    const descOrderIds = filteredDescForCreated.map((s) => s.id);
    const ascOrderIds = filteredAscForCreated.map((s) => s.id);

    TestValidator.equals(
      "asc order should be reverse of desc order for created assignments",
      ascOrderIds,
      [...descOrderIds].reverse(),
    );
  }

  // 6. Range filter: choose created_from/to inside observed created_at values
  // Sort our local createdAtList to compute a middle window
  const sortedCreatedAt = [...createdAtList].sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  const createdFrom = sortedCreatedAt[0];
  const createdTo = sortedCreatedAt[sortedCreatedAt.length - 1];

  const rangeRequestBody = {
    page: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    created_from: createdFrom,
    created_to: createdTo,
    sort_by: "created_at",
    sort_order: "asc",
  } satisfies IShoppingMallAdminRoleAssignment.IRequest;

  const rangePage: IPageIShoppingMallAdminRoleAssignment.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.assignments.index(
      connection,
      {
        adminRoleCode,
        body: rangeRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallAdminRoleAssignment.ISummary>(rangePage);

  const rangeData = rangePage.data;

  // Every returned assignment must have created_at within [createdFrom, createdTo]
  const fromTime = new Date(createdFrom).getTime();
  const toTime = new Date(createdTo).getTime();

  for (const summary of rangeData) {
    const t = new Date(summary.created_at).getTime();
    TestValidator.predicate(
      "assignment created_at within selected range",
      t >= fromTime && t <= toTime,
    );
    TestValidator.equals(
      "role code in range summary matches created role",
      summary.role.code,
      adminRoleCode,
    );
  }

  // Range results should also be ordered by created_at asc
  assertAscOrder(rangeData);

  const paginationRange = rangePage.pagination;
  TestValidator.equals(
    "range page current index is 0",
    paginationRange.current,
    0,
  );
  TestValidator.equals(
    "range page limit matches request",
    paginationRange.limit,
    rangeRequestBody.limit,
  );
  TestValidator.predicate(
    "range page records >= range data length",
    paginationRange.records >= rangeData.length,
  );
}
