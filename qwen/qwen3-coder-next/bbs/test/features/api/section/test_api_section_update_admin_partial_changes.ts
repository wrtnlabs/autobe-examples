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

export async function test_api_section_update_admin_partial_changes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin user for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create a section for testing
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: typia.random<IDiscussionBoardSection.ICreate>(),
    },
  );
  typia.assert(section);
  // 3. Test partial update: empty body (no fields)
  const updatedSection1 =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: (section as any).id,
        body: {} satisfies IDiscussionBoardSection.IUpdate,
      },
    );
  typia.assert(updatedSection1);
  // 4. Test partial update: with valid update payload
  const updatedSection2 =
    await api.functional.discussionBoard.admin.sections.update(
      adminConnection,
      {
        sectionId: (section as any).id,
        body: typia.random<IDiscussionBoardSection.IUpdate>(),
      },
    );
  typia.assert(updatedSection2);
}