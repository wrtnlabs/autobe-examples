import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_admin_unban_non_banned_user(
  connection: api.IConnection,
): Promise<void> {
  // This test attempts to unban a user who is not currently banned.
  // It verifies that the system handles this gracefully with an appropriate error response.
  // 1. Create admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // 2. Create regular member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // Verify member is NOT banned (is_banned should be false)
  TestValidator.equals("member is not banned", member.is_banned, false);
  // 3. Admin attempts to unban the non-banned user
  // This should return an appropriate error since there's no active ban record
  await TestValidator.error("unban non-banned user should fail", async () => {
    await api.functional.discussionBoard.admin.actors.ban.erase(
      adminConnection,
      {
        actorId: member.id,
      },
    );
  });
}
