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
 * Test the system's enforcement of unique section names across the platform.
 * After authenticating as an admin and creating an initial section, the test
 * attempts to create another section with the same name. The system should
 * reject the duplicate section creation attempt and return an appropriate
 * error response. This validates the @@unique([name]) database constraint
 * at the API level and ensures section name uniqueness is properly enforced.
 */
export async function test_api_section_creation_with_duplicate_name_prevention(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Generate a unique section name that follows the proper format constraints
  const sectionName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  }).slice(0, 255); // Ensure it fits within max length constraint
  // Create first section successfully
  const firstSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: sectionName,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(firstSection);
  // Validate first section was created successfully
  TestValidator.equals("section name matches", firstSection.name, sectionName);
  // Attempt to create duplicate section - should fail with business logic error
  await TestValidator.error(
    "duplicate section name should be rejected",
    async () => {
      await api.functional.discussionBoard.admin.sections.create(
        adminConnection,
        {
          body: {
            name: sectionName,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            display_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
            >(),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
}
