import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test successful deletion of an empty discussion board section by administrator.
 *
 * This test verifies that:
 * 1. An authenticated administrator can delete a section they created
 * 2. The deletion succeeds when the section contains no articles
 * 3. The section name becomes available for future reuse
 * 4. The operation completes without errors
 */
export async function test_api_section_deletion_success_empty_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 2. Create an empty section (no articles will be added)
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
        },
      },
    );
  typia.assert(section);
  // 3. Delete the empty section
  await api.functional.discussionBoard.administrator.sections.erase(
    adminConnection,
    {
      sectionId: section.id,
    },
  );
  // 4. Verify section name is available for reuse by creating new section with same name
  const newSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: section.name, // Use the same name as deleted section
          description: "Recreated section after deletion",
        },
      },
    );
  typia.assert(newSection);
  // 5. Confirm the new section has the same name (business logic validation)
  TestValidator.equals(
    "section name is available for reuse after deletion",
    newSection.name,
    section.name,
  );
}
