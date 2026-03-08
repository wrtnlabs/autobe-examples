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

/**
 * Test that updating a non-existent section returns 404 Not Found.
 *
 * Scenario:
 * 1. Administrator joins and authenticates
 * 2. Administrator attempts to update a section with non-existent UUID
 * 3. Expect 404 Not Found error response
 */
export async function test_api_section_update_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Generate non-existent section UUID
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Generate update data
  const updateData = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IDiscussionBoardSection.IUpdate;
  // 4. Attempt to update non-existent section and expect 404
  await TestValidator.httpError(
    "should return 404 for non-existent section",
    404,
    async () => {
      await api.functional.discussionBoard.admin.sections.update(
        adminConnection,
        {
          sectionId: nonExistentSectionId,
          body: updateData,
        },
      );
    },
  );
}
