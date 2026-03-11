import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_admin_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_admin_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_customer_unauthorized_ban_access_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin user
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = typia.random<IEcommerceMallAdmin.IJoin>();
  await authorize_admin_join(adminConnection, { body: adminJoin });
  // 2. Create and authenticate customer user
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = typia.random<IEcommerceMallCustomer.IJoin>();
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: customerJoin,
  });
  // 3. Admin creates a user ban record
  const banPayload: IEcommerceMallUserBan.ICreate = {
    user_id: customerAuthorized.customer.id,
    user_type: "customer" as const,
    reason: "Test ban for unauthorized access verification",
  };
  const ban = await api.functional.ecommerceMall.admin.user_bans.create(
    adminConnection,
    {
      body: banPayload,
    },
  );
  typia.assert(ban);
  // 4. Customer attempts to access the ban record (should be unauthorized)
  await TestValidator.httpError(
    "customer cannot access admin ban record",
    403,
    async () => {
      await api.functional.ecommerceMall.admin.user_bans.at(
        customerConnection,
        {
          userBanId: ban.id,
        },
      );
    },
  );
}
