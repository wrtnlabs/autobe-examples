import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_admin_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_admin_retrieves_customer_ban_details(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Ban a customer to create a ban record
  const customerUserId = typia.random<string & tags.Format<"uuid">>();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await api.functional.ecommerceMall.admin.user_bans.create(
    adminConnection,
    {
      body: {
        user_id: customerUserId,
        user_type: "customer" as const,
        reason: banReason,
        unban_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IEcommerceMallUserBan.ICreate,
    },
  );
  typia.assert(ban);
  // 3. Retrieve the ban details
  const retrievedBan = await api.functional.ecommerceMall.admin.user_bans.at(
    adminConnection,
    {
      userBanId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 4. Validate the retrieved ban record
  TestValidator.equals("ID matches", retrievedBan.id, ban.id);
  TestValidator.equals("userId matches", retrievedBan.userId, ban.userId);
  TestValidator.equals("adminId matches", retrievedBan.adminId, admin.id);
  TestValidator.equals("userType matches", retrievedBan.userType, "customer");
  TestValidator.equals("reason matches", retrievedBan.reason, banReason);
  TestValidator.predicate(
    "bannedAt exists",
    retrievedBan.bannedAt !== null && retrievedBan.bannedAt !== undefined,
  );
  TestValidator.equals("isActive is true", retrievedBan.isActive, true);
  TestValidator.predicate(
    "createdAt exists",
    retrievedBan.createdAt !== null && retrievedBan.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt exists",
    retrievedBan.updatedAt !== null && retrievedBan.updatedAt !== undefined,
  );
}
