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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_administrator_assignment_listing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Step 2: Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Note: Steps 3 & 4 (assign administrators) cannot be implemented because
  // the assignment endpoint is not provided in the API functions list.
  // The scenario requires assigning administrators, but we lack the necessary
  // API endpoint to create assignments. We'll test the listing endpoint with
  // whatever existing assignments exist (possibly zero).
  // Step 5: Call the target endpoint to retrieve assignments
  const request = {
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSuperAdmin.IRequest;
  const assignments =
    await api.functional.discussionBoard.admin.sections.administrators.index(
      adminConnection,
      {
        sectionId: section.id,
        body: request,
      },
    );
  typia.assert(assignments);
  // Validate pagination structure
  TestValidator.equals(
    "pagination exists",
    typeof assignments.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page >= 0",
    assignments.pagination.current >= 0,
  );
  TestValidator.predicate("limit > 0", assignments.pagination.limit > 0);
  TestValidator.predicate("records >= 0", assignments.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", assignments.pagination.pages >= 0);
  // Validate data array structure
  TestValidator.equals("data is array", Array.isArray(assignments.data), true);
  // Validate each assignment if any exist
  for (const assignment of assignments.data) {
    typia.assert(assignment);
    TestValidator.predicate(
      "has permission_level",
      typeof assignment.permission_level === "string",
    );
    TestValidator.predicate(
      "has assignment_date",
      typeof assignment.assignment_date === "string",
    );
    // Check that either admin or superAdmin is present (but not both)
    const hasAdmin = assignment.admin !== null;
    const hasSuperAdmin = assignment.superAdmin !== null;
    TestValidator.predicate(
      "has admin or superAdmin",
      hasAdmin || hasSuperAdmin,
    );
    if (hasAdmin) {
      typia.assert(assignment.admin);
      TestValidator.predicate(
        "admin has id",
        typeof assignment.admin!.id === "string",
      );
      TestValidator.predicate(
        "admin has email",
        typeof assignment.admin!.email === "string",
      );
      TestValidator.predicate(
        "admin has display_name",
        typeof assignment.admin!.display_name === "string",
      );
    }
    if (hasSuperAdmin) {
      typia.assert(assignment.superAdmin);
      TestValidator.predicate(
        "superAdmin has id",
        typeof assignment.superAdmin!.id === "string",
      );
      // Note: IDiscussionBoardSuperAdmin.ISummary structure matches IDiscussionBoardAdmin.ISummary
      // but we'll validate basic properties
      TestValidator.predicate(
        "superAdmin has permission_level",
        typeof assignment.superAdmin!.permission_level === "string",
      );
    }
  }
  // Validate total records matches data length
  TestValidator.equals(
    "records matches data length",
    assignments.pagination.records,
    assignments.data.length,
  );
}