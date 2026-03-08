import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_creation_requires_admin_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a member account (non-admin user)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Test that member cannot create sections (should fail with 403)
  await TestValidator.httpError(
    "member should not be able to create sections",
    403,
    async () => {
      await api.functional.discussionBoard.admin.sections.create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
  // 3. Create an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 4. Test that admin can create sections
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 5. Test unauthenticated request (should fail with 401 or 403)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated user should not be able to create sections",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.admin.sections.create(
        unauthenticatedConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
}
