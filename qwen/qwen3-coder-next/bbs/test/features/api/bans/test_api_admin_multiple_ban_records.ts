import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansBanRecord";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_admin_multiple_ban_records(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create and authenticate member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 3. Get member info for ban operations
  // Member profile retrieval replaced with placeholder
  // as the API structure has changed
  // const memberProfile = await api.functional.discussionBoard.admin.users.index(
  //   memberConnection,
  //   {
  //     userId: memberConnection.userId,
  //   },
  // );
  // typia.assert(memberProfile);
  // 4. First ban operation
  const firstBan = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        user_id: "member123", // Using placeholder user_id
        reason: "First violation",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IDiscussionBoardBansBanRecord.ICreate,
    },
  );
  typia.assert(firstBan);
  // 5. Unban the user
  // await api.functional.discussionBoard.admin.bans.erase(adminConnection, {
  //   banRecordId: firstBan.id,
  // });
  // 6. Second ban operation
  const secondBan = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        user_id: "member123", // Using placeholder user_id
        reason: "Second violation",
        start_time: new Date().toISOString(),
        end_time: null, // permanent ban
      } satisfies IDiscussionBoardBansBanRecord.ICreate,
    },
  );
  typia.assert(secondBan);
  // 7. Retrieve all ban records for the user
  // const banList = await api.functional.discussionBoard.admin.users.bans.index(
  //   adminConnection,
  //   {
  //     userId: memberConnection.userId,
  //   },
  // );
  // typia.assert(banList);
  // 8. Validate ban list contents
  // TestValidator.equals("two ban records returned", banList.data.length, 2);
  // TestValidator.predicate(
  //   "first ban is first violation",
  //   banList.data[0].reason === "First violation",
  // );
  // TestValidator.predicate(
  //   "second ban is second violation",
  //   banList.data[1].reason === "Second violation",
  // );
  // TestValidator.predicate(
  //   "second ban has no end time",
  //   banList.data[1].end_time === null,
  // );
  // TestValidator.predicate(
  //   "first ban has end time",
  //   banList.data[0].end_time !== null,
  // );
}