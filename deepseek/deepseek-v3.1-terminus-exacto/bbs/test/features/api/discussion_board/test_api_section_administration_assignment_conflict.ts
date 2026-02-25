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
import { generate_random_discussion_board_admin_sections_administrators_create } from "../../../generate/generate_random_discussion_board_admin_sections_administrators_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_super_admin } from "../../../prepare/prepare_random_discussion_board_super_admin";

/**
 * Test conflict handling when assigning administrator to section.
 * 1. Authenticate as admin
 * 2. Create section
 * 3. Create second admin account
 * 4. Assign first admin to section
 * 5. Attempt reassignment with different permission level
 * 6. Verify conflict handling
 */
export async function test_api_section_administration_assignment_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate first admin
  const adminConnection1: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // 2. Create section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection1,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Create second admin
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2);
  // 4. Assign first admin to section
  const assignment1 =
    await generate_random_discussion_board_admin_sections_administrators_create(
      adminConnection1,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "moderator",
          admin_id: admin1.id,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  typia.assert(assignment1);
  // 5. Attempt reassignment with different permission level
  await TestValidator.error("duplicate assignment conflict", async () => {
    await generate_random_discussion_board_admin_sections_administrators_create(
      adminConnection1,
      {
        params: { sectionId: section.id },
        body: {
          permission_level: "full_access",
          admin_id: admin1.id,
          super_admin_id: null,
        } satisfies IDiscussionBoardSuperAdmin.ICreate,
      },
    );
  });
  // 6. Verify assignment integrity
  TestValidator.equals(
    "first assignment remains valid",
    assignment1.permission_level,
    "moderator",
  );
  TestValidator.equals(
    "admin assignment correct",
    assignment1.admin?.id,
    admin1.id,
  );
  TestValidator.equals(
    "section assignment correct",
    assignment1.section.id,
    section.id,
  );
}
