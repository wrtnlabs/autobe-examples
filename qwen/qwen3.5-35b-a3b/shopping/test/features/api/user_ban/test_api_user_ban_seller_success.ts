import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_mall_super_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_super_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_user_ban_seller_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  typia.assert(superAdminAuth.superAdministrator);
  // 2. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerAuth);
  const sellerId = sellerAuth.id;
  // 3. Create ban for seller
  const banConnection: api.IConnection = { host: connection.host };
  const ban =
    await api.functional.ecommerceMall.superAdministrator.user_bans.create(
      banConnection,
      {
        body: {
          user_type: "seller",
          seller_id: sellerId,
          reason: "Fraudulent activity detected",
        },
      },
    );
  typia.assert(ban);
  // 4. Validate ban record structure
  TestValidator.equals("user_type is seller", ban.user_type, "seller");
  TestValidator.equals(
    "reason matches",
    ban.reason,
    "Fraudulent activity detected",
  );
  TestValidator.equals(
    "administrator_id matches",
    ban.administrator.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "banned_at is present",
    ban.banned_at !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at is present",
    ban.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at is present",
    ban.updated_at !== undefined,
    true,
  );
  TestValidator.equals("deleted_at is null", ban.deleted_at, null);
  // 5. Validate sellerBan field contains seller reference
  TestValidator.equals(
    "sellerBan.id matches",
    ban.sellerBan.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "sellerBan.email matches",
    ban.sellerBan.seller.email,
    sellerAuth.email,
  );
  TestValidator.equals(
    "sellerBan.display_name matches",
    ban.sellerBan.seller.display_name,
    sellerAuth.display_name,
  );
  TestValidator.equals("customerBan is null", ban.customerBan, null);
  // 6. Validate seller cannot authenticate after ban
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("seller login fails after ban", async () => {
    await api.functional.ecommerceMall.auth.seller.login(
      sellerLoginConnection,
      {
        body: {
          email: sellerAuth.email,
          password: sellerPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      },
    );
  });
}
