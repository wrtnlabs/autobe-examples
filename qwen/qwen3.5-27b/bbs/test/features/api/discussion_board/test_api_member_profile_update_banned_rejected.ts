import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_discussion_board_administrator_ban_records_create } from "../../../generate/generate_random_discussion_board_administrator_ban_records_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test that a banned member is prevented from updating their profile information.
 * 1. Register a new member account
 * 2. Register an administrator account
 * 3. Create a ban record for the member
 * 4. Attempt to update profile with banned member's token
 * 5. Verify 403 Forbidden error is returned
 */
export async function test_api_member_profile_update_banned_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  const memberId = memberAuth.id;
  // 2. Register and authenticate administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminAuth);
  // 3. Create ban record for the member
  const banRecord =
    await generate_random_discussion_board_administrator_ban_records_create(
      adminConnection,
      {
        body: {
          actor_type: "member",
          member_id: memberId,
          ban_reason: "Test ban for profile update rejection test",
        },
      },
    );
  typia.assert(banRecord);
  // 4. Attempt to update profile with banned member's token
  await TestValidator.httpError(
    "banned member profile update rejected with 403",
    403,
    async () => {
      await api.functional.discussionBoard.member.profile.update(
        memberConnection,
        {
          body: {
            displayName: RandomGenerator.name(),
            bio: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IDiscussionBoardMember.IUpdate,
        },
      );
    },
  );
}
