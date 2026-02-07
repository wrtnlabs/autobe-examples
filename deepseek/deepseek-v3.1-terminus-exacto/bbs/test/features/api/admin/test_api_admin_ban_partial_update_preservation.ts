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

export async function test_api_admin_ban_partial_update_preservation(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
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
  // Create comprehensive ban record
  const originalBan = await api.functional.discussionBoard.admin.bans.create(
    adminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 3 }),
        ban_duration_type: "temporary",
        ban_duration_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(originalBan);
  // Wait a moment to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Perform partial update - modify only ban reason
  const updatedReason = RandomGenerator.paragraph({ sentences: 2 });
  const partialUpdate = await api.functional.discussionBoard.admin.bans.update(
    adminConnection,
    {
      banId: originalBan.id,
      body: {
        ban_reason: updatedReason,
      } satisfies IDiscussionBoardBanRecord.IUpdate,
    },
  );
  typia.assert(partialUpdate);
  // Validate preservation of unchanged fields that exist in both DTOs
  TestValidator.equals(
    "ban duration days preserved",
    partialUpdate.ban_duration_days,
    originalBan.ban_duration_days,
  );
  TestValidator.equals(
    "created_at timestamp preserved",
    partialUpdate.created_at,
    originalBan.created_at,
  );
  // Validate updated fields
  TestValidator.equals(
    "ban reason updated",
    partialUpdate.ban_reason,
    updatedReason,
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    partialUpdate.updated_at,
    originalBan.updated_at,
  );
  // Verify ban record has valid structure
  TestValidator.predicate(
    "ban record has valid ID",
    partialUpdate.id === originalBan.id,
  );
  TestValidator.predicate(
    "ban record has valid timestamps",
    typeof partialUpdate.created_at === "string" &&
      typeof partialUpdate.updated_at === "string" &&
      partialUpdate.created_at !== partialUpdate.updated_at,
  );
}
