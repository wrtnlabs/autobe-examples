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
 * Test that the system rejects section creation when a section with the same name
 * already exists, enforcing case-insensitive uniqueness.
 *
 * Prerequisites:
 * 1. Create an administrator account via /auth/admin/join
 *
 * Test Steps:
 * 1. Authenticate as administrator
 * 2. Create first section with name 'Politics' and valid description
 * 3. Verify successful creation
 * 4. Attempt to create a second section with duplicate name 'Politics'
 * 5. Verify the request is rejected with appropriate business constraint error
 * 6. Attempt to create a section with case-variant name 'POLITICS' (uppercase)
 * 7. Verify the request is rejected (case-insensitive comparison)
 * 8. Attempt to create a section with case-variant name 'politics' (lowercase)
 * 9. Verify the request is rejected (case-insensitive comparison)
 */
export async function test_api_section_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.example.com",
      referrer: "https://test.example.com",
    },
  });
  typia.assert(admin);
  // 2. Create first section with name 'Politics'
  const sectionName = "Politics";
  const description = RandomGenerator.paragraph({ sentences: 3 });
  const firstSection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description,
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(firstSection);
  // 3. Verify successful creation
  TestValidator.equals("first section name", firstSection.name, sectionName);
  // 4. Test rejection of exact duplicate name
  await TestValidator.error(
    "should reject duplicate section name (exact match)",
    async () => {
      await api.functional.discussionBoard.admin.sections.create(
        adminConnection,
        {
          body: {
            name: sectionName,
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
  // 5. Test rejection of uppercase variant (case-insensitive)
  await TestValidator.error(
    "should reject duplicate section name (uppercase variant)",
    async () => {
      await api.functional.discussionBoard.admin.sections.create(
        adminConnection,
        {
          body: {
            name: sectionName.toUpperCase(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
  // 6. Test rejection of lowercase variant (case-insensitive)
  await TestValidator.error(
    "should reject duplicate section name (lowercase variant)",
    async () => {
      await api.functional.discussionBoard.admin.sections.create(
        adminConnection,
        {
          body: {
            name: sectionName.toLowerCase(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
}
