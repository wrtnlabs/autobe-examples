import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

/**
 * Test scenario where section update attempts to use a name that already exists for another section.
 * Validate that the operation correctly rejects duplicate section names and returns appropriate
 * validation error. Verify that the original section remains unchanged when name conflict occurs.
 */
export async function test_api_section_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
      display_name: "Test Administrator",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create first section using utility function
  const section1 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Politics",
        description: "Political discussions and debates",
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  // Create second section with different name using utility function
  const section2 = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: "Economy",
        description: "Economic discussions and analysis",
        status: "active",
        display_order: 2,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // Attempt to update first section with second section's name (should fail)
  await TestValidator.error("duplicate section name rejection", async () => {
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section1.id,
        body: {
          name: section2.name, // Attempt to use duplicate name
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  });
  // Verify original section1 remains unchanged
  const originalSection =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: section1.id,
        body: {
          description:
            "Updated description to verify section is still functional",
        } satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(originalSection);
  TestValidator.equals(
    "original section name preserved",
    originalSection.name,
    section1.name,
  );
  TestValidator.notEquals(
    "section description updated",
    originalSection.description,
    section1.description,
  );
}
