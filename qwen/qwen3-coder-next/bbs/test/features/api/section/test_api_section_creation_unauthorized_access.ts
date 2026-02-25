import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_creation_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        displayName: RandomGenerator.name(),
        passwordConfirmation: RandomGenerator.alphaNumeric(16),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(memberUser);
  // 2. Login as the regular member (without super admin privileges)
  const memberLoginConnection: api.IConnection = { host: connection.host };
  const memberLogin = await api.functional.discussionBoard.auth.member.login(
    memberLoginConnection,
    {
      body: {
        email: memberUser.member.email,
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies IDiscussionBoardMember.ILogin,
    },
  );
  typia.assert(memberLogin);
  // 3. Attempt to create a section using the regular member's token
  // Expected: Should fail with 403 Forbidden error for unauthorized access
  await TestValidator.error(
    "regular member cannot create section - should be rejected",
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.create(
        memberLoginConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    },
  );
}
