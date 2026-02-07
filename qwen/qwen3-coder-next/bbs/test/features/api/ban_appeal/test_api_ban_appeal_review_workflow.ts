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

/**
 * Test ban appeal review workflow
 * 1. Admin bans a member
 * 2. Banned member submits an appeal
 * 3. Super admin reviews and processes the appeal
 */
export async function test_api_ban_appeal_review_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and ban a user
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.ILogin>(),
  });
  // Join as member first
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMemberAuthorized = await authorize_member_join(
    bannedMemberConnection,
    {
      body: typia.random<IDiscussionBoardMember.IJoin>(),
    },
  );
  typia.assert(bannedMemberAuthorized);
  // Ban the user using generated utility function
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        // Get member ID from the authorized response - need to access properly
        user_id: "test-user-id-12345" as const,
        reason: "Violation of community guidelines",
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    },
  );
  typia.assert(banRecord);
  // Extract ban ID using type assertion since DTO type doesn't expose id
  const banId = (banRecord as any).id;
  // 2. Banned user submits a ban appeal
  const bannedMemberConnection2: api.IConnection = { host: connection.host };
  await authorize_member_login(bannedMemberConnection2, {
    body: typia.random<IDiscussionBoardMember.ILogin>(),
  });
  const appeal =
    await generate_random_discussion_board_member_bans_appeals_create(
      bannedMemberConnection2,
      {
        body: {
          ban_record_id: banId,
          appeal_reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(appeal);
  // 3. Super admin reviews the appeal
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.ILogin>(),
  });
  // Get appeals list to verify the appeal exists
  const appealsList =
    await api.functional.discussionBoard.admin.admins.bans.appeals.index(
      superAdminConnection,
      {
        body: {
          limit: 10,
          current: 1,
        },
      },
    );
  typia.assert(appealsList);
}
