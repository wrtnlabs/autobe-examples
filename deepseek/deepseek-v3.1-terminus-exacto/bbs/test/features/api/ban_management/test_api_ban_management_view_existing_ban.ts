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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";

export async function test_api_ban_management_view_existing_ban(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Generate a temporary user to ban
  const tempUser: IDiscussionBoardUser = {
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph({ sentences: 1 }),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IDiscussionBoardUser;
  // Create ban record
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        bannedUserId: tempUser.id,
        banReason: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }) satisfies string & tags.MinLength<10>,
        banDurationType: "temporary" as const,
        banDurationDays: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
        >(),
      } satisfies IDiscussionBoardBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // Retrieve the ban record using the target operation
  const retrievedBan = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrievedBan);
  // Validate that all fields are populated and match
  TestValidator.equals("ban ID matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "ban reason matches",
    retrievedBan.banReason,
    banRecord.banReason,
  );
  TestValidator.equals(
    "ban duration type matches",
    retrievedBan.banDurationType,
    banRecord.banDurationType,
  );
  TestValidator.equals(
    "ban status matches",
    retrievedBan.banStatus,
    banRecord.banStatus,
  );
  // Validate nested user information
  TestValidator.equals(
    "banned user ID matches",
    retrievedBan.bannedUser.id,
    tempUser.id,
  );
  TestValidator.equals(
    "banned user email matches",
    retrievedBan.bannedUser.email,
    tempUser.email,
  );
  // Validate administrator information
  TestValidator.predicate(
    "banning administrator has valid ID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedBan.banningAdministrator.id,
    ),
  );
  TestValidator.predicate(
    "banning administrator has valid email",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(retrievedBan.banningAdministrator.email),
  );
  // Validate audit trail timestamps
  TestValidator.predicate(
    "has creation timestamp",
    retrievedBan.createdAt !== null && retrievedBan.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has updated timestamp",
    retrievedBan.updatedAt !== null && retrievedBan.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "has ban started timestamp",
    retrievedBan.banStartedAt !== null && retrievedBan.banStartedAt.length > 0,
  );
}
