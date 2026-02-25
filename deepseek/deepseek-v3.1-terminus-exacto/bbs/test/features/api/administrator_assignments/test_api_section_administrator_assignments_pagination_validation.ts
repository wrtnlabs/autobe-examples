import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_administrators_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_administrators_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

export async function test_api_section_administrator_assignments_pagination_validation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: superAdminCreds,
  });
  // Create a discussion board section
  const section =
    await api.functional.discussionBoard.superAdmin.sections.create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Create multiple administrator accounts for assignments
  const adminAccounts = ArrayUtil.repeat(5, (index) => ({
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  }));
  const createdAdmins: IDiscussionBoardAdmin.IAuthorized[] = [];
  for (const adminCreds of adminAccounts) {
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, {
      body: adminCreds,
    });
    createdAdmins.push(admin);
  }
  // Create multiple administrator assignments with timestamps
  const permissionLevels = ["read", "write", "admin"] as const;
  const assignments = [];
  // Generate assignments with different timestamps
  const baseDate = new Date();
  for (let i = 0; i < 8; i++) {
    const adminIndex = i % createdAdmins.length;
    const permissionLevel = RandomGenerator.pick(permissionLevels);
    const assignment =
      await api.functional.discussionBoard.superAdmin.sections.administrators.create(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            permission_level: permissionLevel,
            admin_id: createdAdmins[adminIndex].id,
          } satisfies IDiscussionBoardSuperAdmin.ICreate,
        },
      );
    typia.assert(assignment);
    assignments.push(assignment);
  }
  // Test pagination with different page sizes
  const testCases = [
    { limit: 2, page: 1 },
    { limit: 5, page: 1 },
    { limit: 10, page: 1 },
    { limit: 3, page: 2 },
    { limit: 2, page: 4 },
    { limit: 100, page: 1 }, // Test requesting more than available records
  ];
  for (const testCase of testCases) {
    const paginatedResult =
      await api.functional.discussionBoard.superAdmin.sections.administrators.index(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            page: testCase.page,
            limit: testCase.limit,
          } satisfies IDiscussionBoardSuperAdmin.IRequest,
        },
      );
    typia.assert(paginatedResult);
    // Validate pagination metadata
    const expectedPages = Math.ceil(assignments.length / testCase.limit);
    const currentPage =
      testCase.page > expectedPages ? expectedPages : testCase.page;
    const expectedRecordsPerPage =
      currentPage === expectedPages
        ? assignments.length - (expectedPages - 1) * testCase.limit
        : Math.min(testCase.limit, assignments.length);
    TestValidator.equals(
      `pagination current page for limit ${testCase.limit}, page ${testCase.page}`,
      paginatedResult.pagination.current,
      currentPage,
    );
    TestValidator.equals(
      `pagination limit for limit ${testCase.limit}, page ${testCase.page}`,
      paginatedResult.pagination.limit,
      testCase.limit,
    );
    TestValidator.equals(
      `total records for limit ${testCase.limit}, page ${testCase.page}`,
      paginatedResult.pagination.records,
      assignments.length,
    );
    TestValidator.equals(
      `total pages for limit ${testCase.limit}, page ${testCase.page}`,
      paginatedResult.pagination.pages,
      expectedPages,
    );
    // Validate data count matches expected records per page
    TestValidator.equals(
      `data count for limit ${testCase.limit}, page ${testCase.page}`,
      paginatedResult.data.length,
      expectedRecordsPerPage,
    );
  }
  // Test filtering by permission level
  const permissionFilterTest =
    await api.functional.discussionBoard.superAdmin.sections.administrators.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "admin",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(permissionFilterTest);
  // Validate that all returned assignments have the specified permission level
  for (const assignment of permissionFilterTest.data) {
    TestValidator.equals(
      "filtered assignment permission level",
      assignment.permission_level,
      "admin",
    );
  }
  // Test assignment date range filtering
  const now = new Date().toISOString();
  const dateFilterTest =
    await api.functional.discussionBoard.superAdmin.sections.administrators.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          assignment_date_start: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          assignment_date_end: now,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(dateFilterTest);
  // Validate date filtered results are within expected range
  TestValidator.predicate(
    "date filtered results have reasonable count",
    dateFilterTest.data.length <= assignments.length,
  );
}
