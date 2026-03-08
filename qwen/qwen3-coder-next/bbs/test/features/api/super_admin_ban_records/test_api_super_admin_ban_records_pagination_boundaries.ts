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

export async function test_api_super_admin_ban_records_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: "SuperAdmin Test",
        bio: "Test super admin for pagination",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuthorized);
  // 2. Create 25 member accounts first to get their IDs
  const memberIds: string[] = [];
  for (let i = 0; i < 25; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const email = typia.random<string & tags.Format<"email">>();
    const memberAuthorized = await authorize_member_join(memberConnection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        display_name: `Member ${i + 1}`,
        bio: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardMember.IJoin,
    });
    typia.assert(memberAuthorized);
    memberIds.push(memberAuthorized.id);
  }
  // 3. Create 25 ban records
  for (let i = 0; i < 25; i++) {
    await api.functional.discussionBoard.superAdmin.actors.ban.create(
      superAdminConnection,
      {
        body: {
          discussion_board_member_id: memberIds[i],
          ban_reason: `Ban reason for member ${i + 1}`,
        } satisfies IDiscussionBoardBanRecord.IRequest,
      },
    );
  }
  // 4. Test pagination with limit=10
  const page1 = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: memberIds[0],
        ban_reason: "Test ban reason",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("page 1 has 10 records", page1.data.length, 10);
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);
  TestValidator.equals("total records", page1.pagination.records, 25);
  TestValidator.equals("total pages", page1.pagination.pages, 3);
  const page2 = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: memberIds[0],
        ban_reason: "Test ban reason",
        page: 2,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("page 2 has 10 records", page2.data.length, 10);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  const page3 = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: memberIds[0],
        ban_reason: "Test ban reason",
        page: 3,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(page3);
  TestValidator.equals("page 3 has 5 records", page3.data.length, 5);
  TestValidator.equals("page 3 current", page3.pagination.current, 3);
  // 5. Test boundary conditions
  const page0 = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: memberIds[0],
        ban_reason: "Test ban reason",
        page: 0,
        limit: 10,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(page0);
  const limit0 = await api.functional.discussionBoard.superAdmin.bans.index(
    superAdminConnection,
    {
      body: {
        discussion_board_member_id: memberIds[0],
        ban_reason: "Test ban reason",
        page: 1,
        limit: 0,
      } satisfies IDiscussionBoardBanRecord.IRequest,
    },
  );
  typia.assert(limit0);
}
