import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanRecord";
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

export async function test_api_super_admin_ban_records_active_inactive_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create super admin and member accounts
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123456",
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await api.functional.discussionBoard.auth.member.join(
    member1Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123456",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await api.functional.discussionBoard.auth.member.join(
    member2Connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "123456",
        display_name: RandomGenerator.name(),
      } satisfies IDiscussionBoardMember.IJoin,
    },
  );
  // 2. Authenticate as super admin
  await api.functional.discussionBoard.auth.superAdmin.login(
    superAdminConnection,
    {
      body: {
        email:
          (superAdminConnection.headers?.Authorization as string | undefined)
            ?.split(" ")[1]
            ?.split(".")[0] ?? "admin@example.com",
        password: "123456",
      } satisfies IDiscussionBoardSuperAdmin.ILogin,
    },
  );
  // 3. Create active ban records
  const ban1 =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member1.id,
          ban_reason: "Violated community guidelines",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(ban1);
  const ban2 =
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member2.id,
          ban_reason: "Spam activity",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(ban2);
  // 4. Unban first member to create inactive record
  await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: member1.id,
        ban_reason: "Temporary ban lifted",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  // 5. Test active status filtering (unbanned_at=null)
  const activeBans = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: member1.id,
        ban_reason: "Violated community guidelines",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(activeBans);
  // Verify at least one active ban exists
  const activeBan = activeBans.data.find((b) => b.unbanned_at === null);
  TestValidator.predicate("has active ban records", activeBan !== undefined);
  if (activeBan) {
    TestValidator.equals(
      "active ban has no unban time",
      activeBan.unbanned_at,
      null,
    );
  }
  // 6. Test inactive status filtering (unbanned_at not null)
  const inactiveBans =
    await api.functional.discussionBoard.superAdmin.bans.index(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: member2.id,
          ban_reason: "Spam activity",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  typia.assert(inactiveBans);
  // Verify at least one inactive ban exists
  const inactiveBan = inactiveBans.data.find((b) => b.unbanned_at !== null);
  TestValidator.predicate(
    "has inactive ban records",
    inactiveBan !== undefined,
  );
  if (inactiveBan) {
    TestValidator.notEquals(
      "inactive ban has unban time",
      inactiveBan.unbanned_at,
      null,
    );
  }
}