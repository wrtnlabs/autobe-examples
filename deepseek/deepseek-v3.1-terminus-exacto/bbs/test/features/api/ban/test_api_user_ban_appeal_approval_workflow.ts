import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_user_ban_appeal_approval_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a user to be banned (mock user creation)
  const userToBan: IDiscussionBoardUser = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  // 3. Create a temporary ban for testing appeal workflow
  const banRecord =
    await generate_random_discussion_board_admin_user_bans_create(
      adminConnection,
      {
        body: {
          bannedUserId: userToBan.id,
          banReason: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 10,
            wordMax: 15,
          }) satisfies string & tags.MinLength<10>,
          banDurationType: "temporary" as const,
          banDurationDays: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<365>
          >(),
        } satisfies IDiscussionBoardBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 4. Update the ban record to approve an appeal
  const appealDecisionReason = RandomGenerator.paragraph({ sentences: 2 });
  const updatedBan =
    await api.functional.discussionBoard.admin.user_bans.update(
      adminConnection,
      {
        banId: banRecord.id,
        body: {
          banStatus: "active",
          appealStatus: "approved",
          appealDecisionReason: appealDecisionReason,
        } satisfies IDiscussionBoardBanRecord.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 5. Validate the appeal approval workflow
  TestValidator.equals("ban ID unchanged", updatedBan.id, banRecord.id);
  TestValidator.equals(
    "appeal status updated to approved",
    updatedBan.appealStatus,
    "approved",
  );
  TestValidator.equals(
    "appeal decision reason set",
    updatedBan.appealDecisionReason,
    appealDecisionReason,
  );
  TestValidator.predicate(
    "appeal reviewed timestamp set",
    updatedBan.appealReviewedAt !== null,
  );
  TestValidator.predicate(
    "appeal reviewed timestamp is valid date",
    updatedBan.appealReviewedAt
      ? !isNaN(new Date(updatedBan.appealReviewedAt).getTime())
      : false,
  );
  TestValidator.equals(
    "ban status remains active",
    updatedBan.banStatus,
    "active",
  );
  TestValidator.equals(
    "banned user unchanged",
    updatedBan.bannedUser.id,
    userToBan.id,
  );
  TestValidator.equals(
    "banning administrator unchanged",
    updatedBan.banningAdministrator.id,
    admin.id,
  );
}
