import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import type { IEcommerceMallUserBanOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_administrator_user_ban_workflow(
  connection: api.IConnection,
): Promise<void> {
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_administrator_join(
    adminJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: adminPassword,
        display_name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: "http://admin.test.com/login",
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerResult = await authorize_member_join(customerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customerResult);
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerResult.email,
      password: customerPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: "http://customer.test.com/login",
      href: "http://customer.test.com/login",
    } satisfies IEcommerceMallMember.ILogin,
  });
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerResult = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      display_name: RandomGenerator.name(2),
    },
  });
  typia.assert(sellerResult);
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerResult.email,
      password: sellerPassword,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: "http://seller.test.com/login",
      href: "http://seller.test.com/login",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  const customerBanReason = RandomGenerator.content({ paragraphs: 1 });
  const customerBanBody = {
    user_type: "customer" as const,
    customer_id: customerResult.id,
    reason: customerBanReason.slice(0, 500),
  } satisfies IEcommerceMallUserBan.ICreate;
  const customerBan =
    await api.functional.ecommerceMall.administrator.user_bans.create(
      adminConnection,
      { body: customerBanBody },
    );
  typia.assert(customerBan);
  typia.assert(customerBan.customerBan);
  TestValidator.equals(
    "customer ban record has correct user type",
    customerBan.user_type,
    "customer",
  );
  TestValidator.equals(
    "customer ban record references correct customer ID",
    customerBan.customerBan.customer.id,
    customerResult.id,
  );
  TestValidator.equals(
    "customer ban has administrator reference",
    customerBan.administrator.id,
    adminJoinResult.id,
  );
  TestValidator.predicate(
    "customer ban has reason within 1-500 characters",
    () => customerBan.reason.length >= 1 && customerBan.reason.length <= 500,
  );
  TestValidator.predicate(
    "customer ban has banned_at timestamp",
    () => customerBan.banned_at !== undefined && customerBan.banned_at !== null,
  );
  const sellerBanReason = RandomGenerator.content({ paragraphs: 1 });
  const sellerBanBody = {
    user_type: "seller" as const,
    seller_id: sellerResult.id,
    reason: sellerBanReason.slice(0, 500),
  } satisfies IEcommerceMallUserBan.ICreate;
  const sellerBan =
    await api.functional.ecommerceMall.administrator.user_bans.create(
      adminConnection,
      { body: sellerBanBody },
    );
  typia.assert(sellerBan);
  typia.assert(sellerBan.sellerBan);
  TestValidator.equals(
    "seller ban record has correct user type",
    sellerBan.user_type,
    "seller",
  );
  TestValidator.equals(
    "seller ban record references correct seller ID",
    sellerBan.sellerBan.seller.id,
    sellerResult.id,
  );
  TestValidator.equals(
    "seller ban has administrator reference",
    sellerBan.administrator.id,
    adminJoinResult.id,
  );
  TestValidator.predicate(
    "seller ban has reason within 1-500 characters",
    () => sellerBan.reason.length >= 1 && sellerBan.reason.length <= 500,
  );
  TestValidator.predicate(
    "seller ban has banned_at timestamp",
    () => sellerBan.banned_at !== undefined && sellerBan.banned_at !== null,
  );
  await TestValidator.error("customer cannot login after ban", async () => {
    await authorize_member_login(customerLoginConnection, {
      body: {
        email: customerResult.email,
        password: customerPassword,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: "http://customer.test.com/login",
        href: "http://customer.test.com/login",
      } satisfies IEcommerceMallMember.ILogin,
    });
  });
  await TestValidator.error("seller cannot login after ban", async () => {
    await authorize_seller_login(sellerLoginConnection, {
      body: {
        email: sellerResult.email,
        password: sellerPassword,
        ip: typia.random<string & tags.Format<"ipv4">>(),
        referrer: "http://seller.test.com/login",
        href: "http://seller.test.com/login",
      } satisfies IEcommerceMallSeller.ILogin,
    });
  });
}
