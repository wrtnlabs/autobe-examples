import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_admin_ban_update_reason_and_duration(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create initial temporary ban
  const initialBan = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "temporary",
        ban_duration_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<30>
        >(),
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(initialBan);
  // Generate new ban reason and extended duration
  const newBanReason = RandomGenerator.paragraph({ sentences: 3 });
  const extendedDuration = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<31> & tags.Maximum<90>
  >();
  // Update ban with new reason and extended duration
  const updatedBan = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: initialBan.id,
      body: {
        ban_reason: newBanReason,
        ban_duration_days: extendedDuration,
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  typia.assert(updatedBan);
  // Validate ban record updates
  TestValidator.notEquals(
    "ban reason changed",
    updatedBan.ban_reason,
    initialBan.ban_reason,
  );
  TestValidator.equals(
    "ban reason updated correctly",
    updatedBan.ban_reason,
    newBanReason,
  );
  TestValidator.notEquals(
    "ban duration changed",
    updatedBan.ban_duration_days,
    initialBan.ban_duration_days,
  );
  TestValidator.equals(
    "ban duration extended correctly",
    updatedBan.ban_duration_days,
    extendedDuration,
  );
  TestValidator.equals(
    "ban status remains active",
    updatedBan.ban_status,
    "active",
  );
  TestValidator.equals(
    "created timestamp unchanged",
    updatedBan.created_at,
    initialBan.created_at,
  );
  TestValidator.predicate(
    "updated timestamp newer than creation",
    new Date(updatedBan.updated_at) > new Date(updatedBan.created_at),
  );
}
