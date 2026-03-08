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

export async function test_api_member_unban_not_authorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin user for authorization context
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12341234",
      display_name: "Admin User",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Step 2: Create regular member (will attempt unauthorized unban)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "12341234",
        display_name: "Regular Member",
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 3: Regular member attempts to unban (should be rejected)
  await TestValidator.error(
    "member cannot unban without admin privileges",
    async () => {
      await api.functional.discussionBoard.admin.actors.ban.erase(
        memberConnection,
        {
          actorId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
