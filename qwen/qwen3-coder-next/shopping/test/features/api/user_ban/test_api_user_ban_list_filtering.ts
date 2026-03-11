import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUserBan";
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

export async function test_api_user_ban_list_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create multiple test user bans with different states and dates
  const users = ArrayUtil.repeat(5, () => ({
    id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    type: RandomGenerator.pick(["customer", "seller"] as const),
  }));
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  // Create different ban states
  const banPromises = [
    // Active ban 1 day ago
    generate_random_ecommerce_mall_admin_user_bans_create(adminConnection, {
      body: {
        user_id: users[0].id,
        user_type: users[0].type,
        reason: "spam",
        unban_at: new Date(now.getTime() + day).toISOString(),
      } satisfies IEcommerceMallUserBan.ICreate,
    }),
    // Active ban 2 days ago
    generate_random_ecommerce_mall_admin_user_bans_create(adminConnection, {
      body: {
        user_id: users[1].id,
        user_type: users[1].type,
        reason: "abuse",
        unban_at: new Date(now.getTime() + day * 2).toISOString(),
      } satisfies IEcommerceMallUserBan.ICreate,
    }),
    // Inactive ban (permanent, unban_at = null)
    generate_random_ecommerce_mall_admin_user_bans_create(adminConnection, {
      body: {
        user_id: users[2].id,
        user_type: users[2].type,
        reason: "spam",
        unban_at: null,
      } satisfies IEcommerceMallUserBan.ICreate,
    }),
    // Inactive ban (temporary, expired)
    generate_random_ecommerce_mall_admin_user_bans_create(adminConnection, {
      body: {
        user_id: users[3].id,
        user_type: users[3].type,
        reason: "violation",
        unban_at: new Date(now.getTime() - day).toISOString(),
      } satisfies IEcommerceMallUserBan.ICreate,
    }),
    // Inactive ban (expired)
    generate_random_ecommerce_mall_admin_user_bans_create(adminConnection, {
      body: {
        user_id: users[4].id,
        user_type: users[4].type,
        reason: "abuse",
        unban_at: new Date(now.getTime() - day * 2).toISOString(),
      } satisfies IEcommerceMallUserBan.ICreate,
    }),
  ];
  const createdBans = await Promise.all(banPromises);
  typia.assert(createdBans);
  // 3. Test filtering by active=true
  const activeResponse =
    await api.functional.ecommerceMall.admin.user_bans.index(adminConnection, {
      body: {
        active: "true",
      } satisfies IEcommerceMallUserBan.IRequest,
    });
  typia.assert(activeResponse);
  // Verify only active bans are returned
  TestValidator.equals("active count", activeResponse.data.length, 2);
  activeResponse.data.forEach((ban) => {
    TestValidator.equals("active status", ban.is_active, true);
  });
  // 4. Test filtering by active=false
  const inactiveResponse =
    await api.functional.ecommerceMall.admin.user_bans.index(adminConnection, {
      body: {
        active: "false",
      } satisfies IEcommerceMallUserBan.IRequest,
    });
  typia.assert(inactiveResponse);
  // Verify only inactive bans are returned
  TestValidator.equals("inactive count", inactiveResponse.data.length, 3);
  inactiveResponse.data.forEach((ban) => {
    TestValidator.equals("inactive status", ban.is_active, false);
  });
  // 5. Test filtering by date range
  const dateRangeResponse =
    await api.functional.ecommerceMall.admin.user_bans.index(adminConnection, {
      body: {
        banned_at_start: new Date(now.getTime() - day).toISOString(),
        banned_at_end: new Date(now.getTime() + day).toISOString(),
      } satisfies IEcommerceMallUserBan.IRequest,
    });
  typia.assert(dateRangeResponse);
}
