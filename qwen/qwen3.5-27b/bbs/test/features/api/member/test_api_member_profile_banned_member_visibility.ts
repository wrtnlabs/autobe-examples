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
 * Test that a member's profile remains viewable even after they have been banned.
 *
 * This test validates that when a member is banned by an administrator, their
 * profile information is still accessible for content attribution purposes,
 * while their login ability is restricted. The test registers a member,
 * registers an administrator, bans the member, and verifies the profile
 * remains viewable with the banned flag set to true.
 */
export async function test_api_member_profile_banned_member_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member account that will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      password: "1234",
    },
  });
  typia.assert(memberJoinResult);
  const memberId: string & tags.Format<"uuid"> = memberJoinResult.id;
  // 2. Register an administrator account with a known password
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      password: "1234",
    },
  });
  typia.assert(adminJoinResult);
  const adminEmail: string & tags.Format<"email"> = adminJoinResult.email;
  // 3. Login as the administrator using the known password
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminEmail,
      password: "1234",
      href: connection.host,
      referrer: connection.host,
    },
  });
  // 4. Create a ban record for the member
  const banRecord =
    await api.functional.discussionBoard.administrator.banRecords.create(
      adminLoginConnection,
      {
        body: {
          actor_type: "member",
          ban_reason: "Violation of community guidelines - test ban",
          member_id: memberId,
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Verify that the member's profile is still accessible
  const memberProfile = await api.functional.discussionBoard.members.at(
    adminLoginConnection,
    {
      memberId: memberId,
    },
  );
  typia.assert(memberProfile);
  // 6. Validate that the banned flag is set to true
  TestValidator.equals("member is banned", memberProfile.banned, true);
  // 7. Validate that other profile information is preserved
  TestValidator.equals("member ID matches", memberProfile.id, memberId);
  TestValidator.predicate(
    "display name preserved",
    memberProfile.display_name !== null,
  );
  TestValidator.predicate("bio preserved", memberProfile.bio !== null);
  TestValidator.predicate(
    "created_at exists",
    memberProfile.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at exists",
    memberProfile.updated_at !== null,
  );
}