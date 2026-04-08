import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanRecord";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_ban_record_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates
  const adminAuth = await authorize_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create admin connection with JWT token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${adminAuth.token.access}` },
  };
  // 3. Retrieve ban record by ID (using random UUID as banId)
  const banId = typia.random<string & tags.Format<"uuid">>() satisfies string &
    tags.Format<"uuid">;
  const banRecord = await api.functional.redditCommunity.admin.bans.at(
    adminConnection,
    { banId },
  );
  typia.assert(banRecord);
  // 4. Validate ban record structure
  TestValidator.equals("ban id matches requested", banRecord.id, banId);
  TestValidator.equals("ban reason is not empty", true, banRecord.reason.length > 0);
  TestValidator.equals("banned_at is not null", true, banRecord.banned_at !== null);
  TestValidator.predicate(
    "unban_at can be null",
    banRecord.unban_at === null || typeof banRecord.unban_at === "string",
  );
  TestValidator.equals("created_at is not null", true, banRecord.created_at !== null);
  TestValidator.equals("updated_at is not null", true, banRecord.updated_at !== null);
  TestValidator.equals(
    "deleted_at is null (active record)",
    true,
    banRecord.deleted_at === null,
  );
  // 5. Validate user reference (banned member)
  TestValidator.predicate("user id is valid uuid", banRecord.user.id !== null);
  TestValidator.equals(
    "user username is not empty",
    true,
    banRecord.user.username.length > 0,
  );
  TestValidator.equals(
    "user created_at is not null",
    true,
    banRecord.user.created_at !== null,
  );
  TestValidator.equals(
    "user updated_at is not null",
    true,
    banRecord.user.updated_at !== null,
  );
  // 6. Validate bannedBy reference (moderator who issued ban)
  TestValidator.predicate(
    "bannedBy id is valid uuid",
    banRecord.bannedBy.id !== null,
  );
  TestValidator.equals(
    "bannedBy username is not empty",
    true,
    banRecord.bannedBy.username.length > 0,
  );
  TestValidator.equals(
    "bannedBy created_at is not null",
    true,
    banRecord.bannedBy.created_at !== null,
  );
  TestValidator.equals(
    "bannedBy updated_at is not null",
    true,
    banRecord.bannedBy.updated_at !== null,
  );
  // 7. Validate community reference
  TestValidator.predicate(
    "community id is valid uuid",
    banRecord.community.id !== null,
  );
  TestValidator.equals(
    "community name is not empty",
    true,
    banRecord.community.name.length > 0,
  );
  TestValidator.equals(
    "community created_at is not null",
    true,
    banRecord.community.created_at !== null,
  );
}