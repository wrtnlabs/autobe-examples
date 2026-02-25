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

export async function test_api_section_administrator_assignments_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account and connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAccount = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAccount);
  // Create regular administrator account and connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAccount = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAccount);
  // Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          status: "active",
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Assign super administrator to section
  const superAdminAssignment =
    await generate_random_discussion_board_super_admin_sections_administrators_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "full_access",
          super_admin_id: superAdminAccount.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(superAdminAssignment);
  // Assign regular administrator to section
  const adminAssignment =
    await generate_random_discussion_board_super_admin_sections_administrators_create(
      superAdminConnection,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "read_only",
          admin_id: adminAccount.id,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(adminAssignment);
  // Retrieve administrator assignments
  const assignments =
    await api.functional.discussionBoard.superAdmin.sections.administrators.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(assignments);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    assignments.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", assignments.pagination.limit, 10);
  TestValidator.predicate(
    "should have at least 2 assignments",
    () => assignments.pagination.records >= 2,
  );
  TestValidator.predicate(
    "should have at least 1 page",
    () => assignments.pagination.pages >= 1,
  );
  // Validate assignment data structure and content
  TestValidator.predicate(
    "should have assignments",
    () => assignments.data.length >= 2,
  );
  const assignmentsWithSuperAdmin = assignments.data.filter(
    (a) => a.superAdmin !== null,
  );
  const assignmentsWithAdmin = assignments.data.filter((a) => a.admin !== null);
  TestValidator.predicate(
    "should have both super admin and admin assignments",
    () =>
      assignmentsWithSuperAdmin.length >= 1 && assignmentsWithAdmin.length >= 1,
  );
  // Validate super administrator assignment details
  const superAdminAssignmentFromResponse = assignmentsWithSuperAdmin.find(
    (a) => a.superAdmin?.id === superAdminAccount.id,
  );
  TestValidator.predicate(
    "super admin assignment found",
    () => superAdminAssignmentFromResponse !== undefined,
  );
  if (superAdminAssignmentFromResponse) {
    TestValidator.equals(
      "super admin assignment permission level",
      superAdminAssignmentFromResponse.permission_level,
      "full_access",
    );
    TestValidator.predicate(
      "super admin assignment has valid date",
      () =>
        new Date(superAdminAssignmentFromResponse.assignment_date).getTime() >
        0,
    );
  }
  // Validate regular administrator assignment details
  const adminAssignmentFromResponse = assignmentsWithAdmin.find(
    (a) => a.admin?.id === adminAccount.id,
  );
  TestValidator.predicate(
    "admin assignment found",
    () => adminAssignmentFromResponse !== undefined,
  );
  if (adminAssignmentFromResponse) {
    TestValidator.equals(
      "admin assignment permission level",
      adminAssignmentFromResponse.permission_level,
      "read_only",
    );
    TestValidator.predicate(
      "admin assignment has valid date",
      () => new Date(adminAssignmentFromResponse.assignment_date).getTime() > 0,
    );
  }
}
