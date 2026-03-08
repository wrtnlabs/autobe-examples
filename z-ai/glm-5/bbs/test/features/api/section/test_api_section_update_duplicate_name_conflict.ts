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
 * Test that updating a section with a duplicate name returns 409 Conflict.
 *
 * Scenario:
 * 1. Administrator joins the system
 * 2. Administrator creates first section with name "Politics"
 * 3. Administrator creates second section with name "Economy"
 * 4. Administrator attempts to update second section with name "politics" (case-insensitive duplicate)
 * 5. Expect 409 Conflict error indicating name uniqueness constraint violation
 */
export async function test_api_section_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication - create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create first section with a unique name
  const firstSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Politics",
          description: "Political discussions and debates",
        },
      },
    );
  typia.assert(firstSection);
  // 3. Create second section with a different name
  const secondSection =
    await generate_random_discussion_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: "Economy",
          description: "Economic discussions and market news",
        },
      },
    );
  typia.assert(secondSection);
  // 4. Attempt to update second section with the first section's name (case-insensitive)
  // The name "politics" (lowercase) should conflict with existing "Politics" due to case-insensitive uniqueness
  await TestValidator.httpError(
    "should return 409 Conflict when updating section with duplicate name (case-insensitive)",
    409,
    async () => {
      await api.functional.discussionBoard.admin.sections.update(
        adminConnection,
        {
          sectionId: secondSection.id,
          body: {
            name: "politics", // lowercase to test case-insensitive conflict with "Politics"
          },
        },
      );
    },
  );
}
