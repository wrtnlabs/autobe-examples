import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_administrator_demotion_super_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const demotingSuperAdminConnection: api.IConnection = {
    host: connection.host,
  };
  const targetSuperAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Create and authenticate demoting super admin
  const demotingSuperAdmin = await authorize_super_admin_join(
    demotingSuperAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(demotingSuperAdmin);
  // Step 2: Create and authenticate target super admin to be demoted
  const targetSuperAdmin = await authorize_super_admin_join(
    targetSuperAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(targetSuperAdmin);
  // Step 3: Verify target super admin has super admin privileges before demotion
  const sectionBeforeDemotion =
    await api.functional.discussionBoard.superAdmin.sections.create(
      targetSuperAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
          display_order: 1,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(sectionBeforeDemotion);
  TestValidator.predicate(
    "section created by super admin",
    sectionBeforeDemotion.id !== undefined,
  );
  // Step 4: Perform demotion from super admin to regular admin
  const demotionResult =
    await api.functional.discussionBoard.superAdmin.administrators.update(
      demotingSuperAdminConnection,
      {
        administratorId: targetSuperAdmin.id,
        body: {
          permission_level: "admin",
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  typia.assert(demotionResult);
  TestValidator.equals(
    "permission level updated to admin",
    demotionResult.permission_level,
    "admin",
  );
  // Step 5: Verify target loses super admin privileges
  await TestValidator.error(
    "cannot create section as super admin",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.create(
        targetSuperAdminConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            status: "active",
            display_order: 2,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
  // Step 6: Verify target retains regular admin capabilities
  const adminSection =
    await api.functional.discussionBoard.admin.sections.create(
      targetSuperAdminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          status: "active",
          display_order: 3,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(adminSection);
  TestValidator.predicate(
    "section created by regular admin",
    adminSection.id !== undefined,
  );
  // Step 7: Test self-demotion prevention
  await TestValidator.error("cannot demote self", async () => {
    await api.functional.discussionBoard.superAdmin.administrators.update(
      demotingSuperAdminConnection,
      {
        administratorId: demotingSuperAdmin.id,
        body: {
          permission_level: "admin",
        } satisfies IDiscussionBoardSuperAdmin.IUpdate,
      },
    );
  });
}
