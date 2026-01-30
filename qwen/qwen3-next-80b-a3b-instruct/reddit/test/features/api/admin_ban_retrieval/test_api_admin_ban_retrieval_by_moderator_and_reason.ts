import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBbsUserBan";
import { prepare_random_community_bbs_user_ban } from "../../../prepare/prepare_random_community_bbs_user_ban";
import { generate_random_community_bbs_admin_users_bans_create } from "../../../generate/generate_random_community_bbs_admin_users_bans_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_ban_retrieval_by_moderator_and_reason(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin to access moderated ban data
  const adminConnection: api.IConnection = { host: connection.host };
  // Use generated password and store it for subsequent login
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(adminResult);
  // adminConnection.headers is now updated internally by authorize function
  // Step 2: Create test ban records with different moderators and ban reasons to validate filtering accuracy
  // Create first ban record - moderator 1, reason: 'spam'
  const admin1Password = RandomGenerator.alphaNumeric(16);
  const admin1 = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: admin1Password,
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin1);
  const admin1Connection: api.IConnection = { host: connection.host };
  // Use the stored plain text password for login
  await authorize_admin_login(admin1Connection, {
    body: {
      email: admin1.email,
      password: admin1Password,
    },
  });
  const user1 = await generate_random_community_bbs_admin_users_bans_create(
    admin1Connection,
    {
      body: {
        userId: typia.random<string & tags.Format<"uuid">>(),
        reason: "spam",
      } satisfies ICommunityBbsUserBan.ICreate,
    },
  );
  typia.assert(user1);
  // Validate the ban record has the correct moderator_id
  TestValidator.equals(
    "ban1 moderator_id correct",
    user1.bannedBy.id,
    admin1.id,
  );
  TestValidator.equals("ban1 ban_reason correct", user1.reason, "spam");
  // Create second ban record - moderator 1, reason: 'harassment'
  const user2 = await generate_random_community_bbs_admin_users_bans_create(
    admin1Connection,
    {
      body: {
        userId: typia.random<string & tags.Format<"uuid">>(),
        reason: "harassment",
      } satisfies ICommunityBbsUserBan.ICreate,
    },
  );
  typia.assert(user2);
  TestValidator.equals(
    "ban2 moderator_id correct",
    user2.bannedBy.id,
    admin1.id,
  );
  TestValidator.equals("ban2 ban_reason correct", user2.reason, "harassment");
  // Create third ban record - different moderator, reason: 'spam'
  const admin2Password = RandomGenerator.alphaNumeric(16);
  const admin2 = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: admin2Password,
    } satisfies ICommunityBbsAdmin.IJoin,
  });
  typia.assert(admin2);
  const admin2Connection: api.IConnection = { host: connection.host };
  // Use the stored plain text password for login
  await authorize_admin_login(admin2Connection, {
    body: {
      email: admin2.email,
      password: admin2Password,
    },
  });
  const user3 = await generate_random_community_bbs_admin_users_bans_create(
    admin2Connection,
    {
      body: {
        userId: typia.random<string & tags.Format<"uuid">>(),
        reason: "spam",
      } satisfies ICommunityBbsUserBan.ICreate,
    },
  );
  typia.assert(user3);
  TestValidator.equals(
    "ban3 moderator_id correct",
    user3.bannedBy.id,
    admin2.id,
  );
  TestValidator.equals("ban3 ban_reason correct", user3.reason, "spam");
  // Step 3: Admin authenticates and searches for bans issued by a specific moderator for a given ban reason
  const adminSearchConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminSearchConnection, {
    body: {
      email: adminResult.email,
      password: adminPassword,
    },
  });
  const searchResult = await api.functional.communityBbs.admin.users.bans.patch(
    adminSearchConnection,
    {
      body: {
        moderator_id: admin1.id,
        ban_reason: "spam",
      } satisfies ICommunityBbsUserBan.IRequest,
    },
  );
  typia.assert(searchResult);
  // Step 4: Validates that only bans matching both criteria are returned
  TestValidator.equals(
    "correct page count for filtered results",
    searchResult.pagination.records,
    1,
  );
  TestValidator.equals(
    "correct number of items returned",
    searchResult.data.length,
    1,
  );
  // Validates that returned ban has accurate moderation context (moderator_id, ban_reason)
  const matchingBan = searchResult.data[0];
  TestValidator.equals("correct ban reason", matchingBan.banReason, "spam");
  TestValidator.equals(
    "correct moderator_id",
    matchingBan.moderatorId,
    admin1.id,
  );
  // Validates that bans with different reasons are excluded
  const banWithDifferentReason = searchResult.data.find(
    (b) => b.banReason === "harassment",
  );
  TestValidator.equals(
    "bans with different reason excluded",
    banWithDifferentReason,
    undefined,
  );
  // Validates that bans issued by other moderators are excluded
  const banByOtherModerator = searchResult.data.find(
    (b) => b.moderatorId === admin2.id,
  );
  TestValidator.equals(
    "bans by other moderators excluded",
    banByOtherModerator,
    undefined,
  );
}
