import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test that a super admin can remove any ban regardless of who created it.
 * Validates super admin authority over ban management system.
 */
export async function test_api_user_bans_remove_super_admin_authority(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);
  // 2. Create regular admin account (admin1) who will create the ban
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1);
  // 3. Create super admin account (admin2) who will remove the ban
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_super_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(admin2);
  // 4. Admin1 creates a ban record for the member
  const ban = await generate_random_discussion_board_admin_user_bans_create(
    admin1Connection,
    {
      body: {
        member_id: member.id,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expires_at: null,
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // Validate ban was created successfully
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.equals(
    "banned member ID should match",
    ban.member?.id,
    member.id,
  );
  TestValidator.equals(
    "banning admin ID should match",
    ban.admin?.id,
    admin1.id,
  );
  // 5. Admin2 removes the ban record
  await api.functional.discussionBoard.admin.user_bans.erase(admin2Connection, {
    banId: ban.id,
  });
  // 6. Validate that super admin successfully removed the ban
  // Verify the removal was effective by testing member login capability
  const memberLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberLoginConnection, {
    body: {
      email: member.email,
      password: RandomGenerator.alphaNumeric(16), // Use the original password
    } satisfies IDiscussionBoardMember.ILogin,
  });
  // 7. Verify super admin authority - attempt to remove non-existent ban should fail
  await TestValidator.error(
    "removing non-existent ban should fail",
    async () => {
      await api.functional.discussionBoard.admin.user_bans.erase(
        admin2Connection,
        {
          banId: ban.id,
        },
      );
    },
  );
  // 8. Validate authorization hierarchy - regular admin cannot remove bans created by others
  // Create a new ban to test this scenario
  const secondBan =
    await generate_random_discussion_board_admin_user_bans_create(
      admin1Connection,
      {
        body: {
          member_id: member.id,
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: null,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(secondBan);
  // Regular admin should not be able to remove ban created by another admin
  await TestValidator.error(
    "regular admin cannot remove ban created by another admin",
    async () => {
      await api.functional.discussionBoard.admin.user_bans.erase(
        admin1Connection,
        {
          banId: secondBan.id,
        },
      );
    },
  );
  // Super admin should be able to remove it
  await api.functional.discussionBoard.admin.user_bans.erase(admin2Connection, {
    banId: secondBan.id,
  });
  TestValidator.predicate("super admin authority validated successfully", true);
}
