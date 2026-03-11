import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
import { generate_random_discussion_board_admin_user_bans_create } from "../../../generate/generate_random_discussion_board_admin_user_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

export async function test_api_user_ban_update_extend_duration(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create a temporary ban with initial expiration date
  // Note: Since we don't have member creation utilities, we'll use a random valid UUID
  // In a real scenario, we would create a member first
  const initialExpiration = typia.random<string & tags.Format<"date-time">>();
  const initialBan =
    await api.functional.discussionBoard.admin.user_bans.create(
      adminConnection,
      {
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          expires_at: initialExpiration,
        } satisfies IDiscussionBoardUserBan.ICreate,
      },
    );
  typia.assert(initialBan);
  // Extend the ban duration by updating expiration date
  const newExpiration = typia.random<string & tags.Format<"date-time">>();
  const updatedBan =
    await api.functional.discussionBoard.admin.user_bans.update(
      adminConnection,
      {
        banId: initialBan.id,
        body: {
          expires_at: newExpiration,
        } satisfies IDiscussionBoardUserBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Validate the ban was extended correctly
  TestValidator.equals("ban ID remains the same", updatedBan.id, initialBan.id);
  TestValidator.equals(
    "reason remains unchanged",
    updatedBan.reason,
    initialBan.reason,
  );
  TestValidator.equals("status remains active", updatedBan.status, "active");
  TestValidator.equals(
    "expiration date extended",
    updatedBan.expires_at,
    newExpiration,
  );
  TestValidator.notEquals(
    "updated_at timestamp refreshed",
    updatedBan.updated_at,
    initialBan.updated_at,
  );
  TestValidator.predicate(
    "ban is still active",
    updatedBan.status === "active",
  );
}
