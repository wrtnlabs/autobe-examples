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

export async function test_api_admin_ban_record_retrieval_revoked_ban(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as administrator
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
  // Create a ban record using the correct endpoint
  const banRecord = await api.functional.discussionBoard.admin.bans.create(
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
  typia.assert(banRecord);
  // Revoke the ban with a specific reason
  const revocationReason = RandomGenerator.paragraph({ sentences: 1 });
  const revokedBan = await api.functional.discussionBoard.admin.revoke(
    adminConnection,
    {
      banId: banRecord.id,
      body: {
        revoked_reason: revocationReason,
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    },
  );
  typia.assert(revokedBan);
  // Retrieve the revoked ban record
  const retrievedBan = await api.functional.discussionBoard.admin.bans.at(
    adminConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrievedBan);
  // Validate the ban record details
  TestValidator.equals(
    "ban ID remains unchanged",
    retrievedBan.id,
    banRecord.id,
  );
  TestValidator.equals(
    "ban reason remains unchanged",
    retrievedBan.ban_reason,
    banRecord.ban_reason,
  );
  TestValidator.equals(
    "ban status is revoked",
    retrievedBan.ban_status,
    "revoked",
  );
  TestValidator.predicate(
    "revoked_at timestamp is set",
    retrievedBan.revoked_at !== null,
  );
  TestValidator.equals(
    "revoked_reason matches revocation reason",
    retrievedBan.revoked_reason,
    revocationReason,
  );
  TestValidator.predicate(
    "created_at timestamp is valid",
    retrievedBan.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    retrievedBan.updated_at !== null,
  );
}
