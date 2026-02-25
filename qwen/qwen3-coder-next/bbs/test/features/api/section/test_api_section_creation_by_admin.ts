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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create section with simple name
  const section1 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: "Economic Policy",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section1);
  // 3. Validate section 1
  TestValidator.equals(
    "section name matches",
    section1.name,
    "Economic Policy",
  );
  // 4. Create section with description
  const section2 = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: "Political Debate",
        description: "Discussion forum for political topics and debates.",
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section2);
  // 5. Validate section 2
  TestValidator.equals(
    "section name matches",
    section2.name,
    "Political Debate",
  );
  TestValidator.equals(
    "section description matches",
    section2.description,
    "Discussion forum for political topics and debates.",
  );
}
