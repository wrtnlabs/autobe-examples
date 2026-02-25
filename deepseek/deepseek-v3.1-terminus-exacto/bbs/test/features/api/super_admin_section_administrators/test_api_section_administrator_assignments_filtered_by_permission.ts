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

export async function test_api_section_administrator_assignments_filtered_by_permission(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate super administrator and create section
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          status: "active",
          display_order: 1 satisfies number as number,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Step 2: Create three administrator accounts
  const adminIds: string[] = [];
  const adminConnections: api.IConnection[] = [];
  const permissionLevels = ["read", "write", "full"] as const;
  for (let i = 0; i < 3; i++) {
    const adminConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(authorized);
    adminIds.push(authorized.id);
    adminConnections.push(adminConnection);
  }
  // Step 3: Assign administrators with different permission levels
  const assignments: IDiscussionBoardSuperAdmin[] = [];
  for (let i = 0; i < 3; i++) {
    const assignment =
      await generate_random_discussion_board_super_admin_sections_administrators_create(
        superAdminConnection,
        {
          params: { sectionId: section.id },
          body: {
            permission_level: permissionLevels[i],
            admin_id: adminIds[i],
            super_admin_id: null,
          } satisfies IDiscussionBoardSuperAdmin.ICreate,
        },
      );
    typia.assert(assignment);
    assignments.push(assignment);
  }
  // Step 4: Test filtering by each permission level
  for (const permissionLevel of permissionLevels) {
    const filtered =
      await api.functional.discussionBoard.superAdmin.sections.administrators.index(
        superAdminConnection,
        {
          sectionId: section.id,
          body: {
            permission_level: permissionLevel,
            page: 1,
            limit: 10,
          } satisfies IDiscussionBoardSuperAdmin.IRequest,
        },
      );
    typia.assert(filtered);
    // Validate filtering logic
    TestValidator.equals(
      `filter by ${permissionLevel} returns correct count`,
      filtered.data.length,
      1,
    );
    TestValidator.equals(
      `filter by ${permissionLevel} returns correct permission level`,
      filtered.data[0].permission_level,
      permissionLevel,
    );
    TestValidator.predicate(
      `filter by ${permissionLevel} returns matching admin`,
      filtered.data[0].admin !== null,
    );
    TestValidator.equals(
      `filter by ${permissionLevel} returns correct admin id`,
      filtered.data[0].admin?.id,
      assignments.find((a) => a.permission_level === permissionLevel)?.admin
        ?.id,
    );
  }
  // Step 5: Test filtering with no matching permission
  const nonExistentFilter =
    await api.functional.discussionBoard.superAdmin.sections.administrators.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          permission_level: "nonexistent",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(nonExistentFilter);
  TestValidator.equals(
    "non-existent permission filter returns empty",
    nonExistentFilter.data.length,
    0,
  );
  // Step 6: Test filtering without permission filter (should return all)
  const allAssignments =
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
  typia.assert(allAssignments);
  TestValidator.equals(
    "no permission filter returns all assignments",
    allAssignments.data.length,
    3,
  );
}
