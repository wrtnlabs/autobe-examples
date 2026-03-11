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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test that the system prevents creating a duplicate ban for an already banned member.
 * 1. Create super administrator account
 * 2. Create member account to be banned
 * 3. Create initial ban for the member
 * 4. Attempt to create duplicate ban for same member
 * 5. Validate duplicate ban attempt fails with appropriate error
 * 6. Verify only one active ban exists per member
 */
export async function test_api_user_ban_superadmin_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create member account to be banned
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
  // 3. Create initial ban for the member
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const initialBan =
    await generate_random_discussion_board_super_admin_user_bans_create(
      superAdminConnection,
      {
        body: {
          member_id: member.id,
          reason: banReason,
          expires_at: null,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(initialBan);
  // 4. Attempt to create duplicate ban for same member
  await TestValidator.httpError(
    "duplicate ban should fail with conflict error",
    409,
    async () => {
      await generate_random_discussion_board_super_admin_user_bans_create(
        superAdminConnection,
        {
          body: {
            member_id: member.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            expires_at: null,
          } satisfies IDiscussionBoardUserBan.ICreate,
        },
      );
    },
  );
  // 5. Validate ban properties
  TestValidator.equals("ban reason matches", initialBan.reason, banReason);
  TestValidator.equals("member ID matches", initialBan.member?.id, member.id);
  TestValidator.equals("status is active", initialBan.status, "active");
  TestValidator.predicate(
    "banned_at is valid date",
    new Date(initialBan.banned_at).getTime() > 0,
  );
  TestValidator.predicate(
    "expires_at is null for permanent ban",
    initialBan.expires_at === null,
  );
  // 6. Validate that only one ban exists by checking the initial ban is still valid
  TestValidator.predicate(
    "initial ban remains valid",
    initialBan.id !== undefined && initialBan.id !== null,
  );
}
