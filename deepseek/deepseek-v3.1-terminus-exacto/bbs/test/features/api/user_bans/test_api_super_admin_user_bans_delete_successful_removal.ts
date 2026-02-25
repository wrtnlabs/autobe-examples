import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

/**
 * Test successful deletion of a user ban record by a super administrator.
 */
export async function test_api_super_admin_user_bans_delete_successful_removal(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminJoinResponse = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // 2. Create regular user account with known password
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinResponse = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      display_name: RandomGenerator.name(),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // 3. Create administrator account to create the ban
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 4. Create ban record for the user
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: userJoinResponse.id,
          banReason: RandomGenerator.paragraph({ sentences: 3 }),
          banDurationType: "temporary" as const,
          banDurationDays: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Delete the ban record using super administrator
  await api.functional.discussionBoard.superAdmin.user_bans.erase(
    superAdminConnection,
    {
      banId: banRecord.id,
    },
  );
  // 6. Verify deletion by attempting to access the deleted ban - should fail
  await TestValidator.error(
    "ban record should not exist after deletion",
    async () => {
      await api.functional.discussionBoard.superAdmin.user_bans.erase(
        superAdminConnection,
        {
          banId: banRecord.id,
        },
      );
    },
  );
  // 7. Verify banned user can now log in successfully with correct password
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userLoginResponse = await authorize_user_login(userLoginConnection, {
    body: {
      email: userJoinResponse.email,
      password: userPassword,
    } satisfies IDiscussionBoardUser.ILogin,
  });
  typia.assert(userLoginResponse);
  TestValidator.equals(
    "user should be able to login after ban removal",
    userLoginResponse.id,
    userJoinResponse.id,
  );
}
