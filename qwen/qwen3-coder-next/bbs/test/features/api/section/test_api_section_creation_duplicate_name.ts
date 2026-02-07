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
 * Test duplicate section name rejection: An authenticated administrator attempts
 * to create a section with a name that already exists in the system. The system
 * should validate the unique name constraint and return a conflict error.
 */
export async function test_api_section_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardAdmin.IJoin>(),
    },
  );
  adminConnection.headers = { Authorization: authorized.token.access };
  // 2. Create first section with a random name
  const section1 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: "Test Section",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  // 3. Attempt to create second section with the same name (should fail)
  await TestValidator.error("duplicate section name", async () => {
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: {
          name: "Test Section",
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  });
}
