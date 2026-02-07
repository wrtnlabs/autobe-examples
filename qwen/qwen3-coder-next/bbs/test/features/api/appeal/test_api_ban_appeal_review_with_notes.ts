import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansAppeal";
import type { IDiscussionBoardBansBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBansBanRecord";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardBansAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBansAppeal";
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
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_member_bans_appeals_create } from "../../../generate/generate_random_discussion_board_member_bans_appeals_create";
import { prepare_random_discussion_board_bans_appeal } from "../../../prepare/prepare_random_discussion_board_bans_appeal";
import { prepare_random_discussion_board_bans_ban_record } from "../../../prepare/prepare_random_discussion_board_bans_ban_record";

export async function test_api_ban_appeal_review_with_notes(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: "superadmin@test.com",
      password: "1234",
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "1234",
    } satisfies IDiscussionBoardMember.IJoin,
  });
  // 2. Create ban record by admin using utility
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        user_id: "user-id-123",
        reason: "Violating community guidelines",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(banRecord);
  // 3. Member submits appeal
  const appealBody = {
    ban_record_id: "ban-record-id-456",
    appeal_reason:
      "I believe this ban was issued in error and would like to appeal.",
    status: "pending",
  } satisfies IDiscussionBoardBansAppeal.ICreate;
  const appeal =
    await api.functional.discussionBoard.member.bans.appeals.create(
      memberConnection,
      {
        body: appealBody,
      },
    );
  typia.assert(appeal);
  // 4. Super admin reviews the appeal with notes
  const result =
    await api.functional.discussionBoard.admin.admins.bans.appeals.index(
      superAdminConnection,
      {
        body: {
          status: "approved",
          review_notes:
            "Appeal approved after reviewing the user's history and the ban context. The user has been informed of the decision.",
        } satisfies IDiscussionBoardBansAppeal.IRequest,
      },
    );
  typia.assert(result);
  // 5. Verify the appeal was processed
  TestValidator.predicate(
    "appeal results returned",
    () => result.data.length > 0,
  );
}
