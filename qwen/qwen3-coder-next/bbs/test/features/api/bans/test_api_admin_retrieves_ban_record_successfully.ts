import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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

export async function test_api_admin_retrieves_ban_record_successfully(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminProfile = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminProfile);
  // Step 2: Create a ban record by banning a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.discussionBoard.auth.admin.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(member);
  // Ban the member
  await api.functional.discussionBoard.admin.users.ban(adminConnection, {
    id: member.id,
    body: {
      reason: RandomGenerator.paragraph({ sentences: 3 }),
    } satisfies IDiscussionBoardMember.IBanRequest,
  });
  // Step 3: Retrieve the ban record
  const banRecord = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    {
      banId: member.id,
    },
  );
  typia.assert(banRecord);
  // Validate ban record properties
  TestValidator.equals("user is banned", banRecord.isActive, false);
}
