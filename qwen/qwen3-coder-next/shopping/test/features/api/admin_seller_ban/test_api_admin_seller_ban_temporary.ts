import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_admin_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_admin_seller_ban_temporary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and authenticates (super admin)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Seller joins and authenticates (creates active session)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Seller login (creates active session that will be terminated)
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuthorized.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 4. Admin bans seller temporarily (7 days)
  const unbanAt = new Date();
  unbanAt.setDate(unbanAt.getDate() + 7);
  const banRecord: IEcommerceMallUserBan =
    await api.functional.ecommerceMall.admin.user_bans.create(adminConnection, {
      body: {
        user_id: sellerAuthorized.id,
        user_type: "seller" as const,
        reason: "Policy violation",
        unban_at: unbanAt.toISOString() as string & tags.Format<"date-time">,
      } satisfies IEcommerceMallUserBan.ICreate,
    });
  typia.assert(banRecord);
  // 5. Validate ban record fields
  TestValidator.equals(
    "seller ID matches",
    banRecord.userId,
    sellerAuthorized.id,
  );
  TestValidator.equals("user type is seller", banRecord.userType, "seller");
  TestValidator.equals("reason matches", banRecord.reason, "Policy violation");
  TestValidator.equals("is_active is true", banRecord.isActive, true);
  TestValidator.equals(
    "unban_at matches",
    banRecord.unbanAt,
    unbanAt.toISOString(),
  );
  // 6. Seller login attempt fails (session terminated)
  await TestValidator.error("seller login rejected after ban", async () => {
    await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
      body: {
        email: sellerAuthorized.email,
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  });
}
