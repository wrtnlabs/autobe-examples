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

export async function test_api_member_ban_already_banned_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  const originalBanReason = RandomGenerator.paragraph({ sentences: 3 });
  // 3. Successfully ban the member with initial reason
  const firstBanResult = await api.functional.discussionBoard.admin.members.ban(
    adminConnection,
    {
      memberId,
      body: { reason: originalBanReason } satisfies IDiscussionBoardMember.IBan,
    },
  );
  typia.assert(firstBanResult);
  TestValidator.equals("first ban status", firstBanResult.ban_status, "banned");
  TestValidator.equals(
    "first ban reason",
    firstBanResult.ban_reason,
    originalBanReason,
  );
  // 4. Attempt to ban the same member again with different reason
  const secondBanReason = RandomGenerator.paragraph({ sentences: 2 });
  await TestValidator.httpError(
    "second ban attempt should return 409 conflict",
    409,
    async () => {
      await api.functional.discussionBoard.admin.members.ban(adminConnection, {
        memberId,
        body: { reason: secondBanReason } satisfies IDiscussionBoardMember.IBan,
      });
    },
  );
}
