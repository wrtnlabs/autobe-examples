import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_bans_create } from "../../../generate/generate_random_discussion_board_super_admin_bans_create";
import { prepare_random_discussion_board_user_ban } from "../../../prepare/prepare_random_discussion_board_user_ban";

/**
 * Test retrieval of ban record that has been manually revoked by an administrator.
 * Authenticate as superAdmin, create a ban record, then revoke it using the available
 * admin revocation operation, and finally retrieve the revoked ban record.
 * Validate that ban_status shows 'revoked', revoked_at contains revocation timestamp,
 * revoked_reason contains administrator's explanation, and all original ban information
 * remains accessible for administrative accountability and audit purposes.
 */
export async function test_api_ban_retrieval_revoked_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a ban record using utility function
  const ban = await generate_random_discussion_board_super_admin_bans_create(
    superAdminConnection,
    {
      body: {
        banned_user_id: typia.random<string & tags.Format<"uuid">>(),
        ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_type: "temporary",
        ban_duration_days: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
      } satisfies IDiscussionBoardUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // 3. Authenticate as admin to perform revocation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 4. Revoke the ban record
  const revokedBan = await api.functional.discussionBoard.admin.revoke(
    adminConnection,
    {
      banId: ban.id,
      body: {
        revoked_reason: RandomGenerator.paragraph({ sentences: 1 }),
      } satisfies IDiscussionBoardBanRecord.IRevoke,
    },
  );
  typia.assert(revokedBan);
  // 5. Retrieve the revoked ban record
  const retrievedBan = await api.functional.discussionBoard.superAdmin.bans.at(
    superAdminConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate revocation details
  TestValidator.equals(
    "ban status should be revoked",
    retrievedBan.ban_status,
    "revoked",
  );
  TestValidator.predicate(
    "revoked_at should be set",
    retrievedBan.revoked_at !== null,
  );
  TestValidator.predicate(
    "revoked_reason should be set",
    retrievedBan.revoked_reason !== null,
  );
  TestValidator.equals(
    "ban reason should remain unchanged",
    retrievedBan.ban_reason,
    ban.ban_reason,
  );
  TestValidator.equals(
    "ban duration should remain unchanged",
    retrievedBan.ban_duration_days,
    ban.ban_duration_days,
  );
  TestValidator.equals(
    "created_at should remain unchanged",
    retrievedBan.created_at,
    ban.created_at,
  );
  TestValidator.predicate(
    "updated_at should reflect revocation",
    retrievedBan.updated_at !== ban.updated_at,
  );
}
