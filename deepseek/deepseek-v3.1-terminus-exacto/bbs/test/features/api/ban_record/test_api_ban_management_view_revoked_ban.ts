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

export async function test_api_ban_management_view_revoked_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: "Test Admin",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a ban record using provided UUID for banned user (mock scenario)
  const createBody = {
    bannedUserId: typia.random<string & tags.Format<"uuid">>(),
    banReason: "Violation of community guidelines - repeated spam posting",
    banDurationType: "temporary" as const,
    banDurationDays: 7,
  } satisfies IDiscussionBoardBanRecord.ICreate;
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    { body: createBody },
  );
  typia.assert(banRecord);
  // Revoke the ban
  const revokeBody = {
    revoked_reason: "User appeal approved - first offense",
  } satisfies IDiscussionBoardBanRecord.IRevoke;
  const revokedBan = await api.functional.discussionBoard.admin.bans.revoke(
    adminConnection,
    {
      banId: banRecord.id,
      body: revokeBody,
    },
  );
  typia.assert(revokedBan);
  // Retrieve the revoked ban
  const retrievedBan = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    { banId: banRecord.id },
  );
  typia.assert(retrievedBan);
  // Validate the revoked ban properties
  TestValidator.equals("ban ID matches", retrievedBan.id, banRecord.id);
  TestValidator.equals(
    "ban status is revoked",
    retrievedBan.banStatus,
    "revoked",
  );
  TestValidator.predicate(
    "revocation timestamp is populated",
    retrievedBan.revokedAt !== null,
  );
  TestValidator.equals(
    "revocation reason matches",
    retrievedBan.revocationReason,
    revokeBody.revoked_reason,
  );
  TestValidator.equals(
    "ban reason remains intact",
    retrievedBan.banReason,
    banRecord.banReason,
  );
  TestValidator.equals(
    "ban duration type remains intact",
    retrievedBan.banDurationType,
    banRecord.banDurationType,
  );
  TestValidator.predicate(
    "ban start time preserved",
    retrievedBan.banStartedAt === banRecord.banStartedAt,
  );
}
