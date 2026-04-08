import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
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
import { generate_random_ecommerce_mall_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

export async function test_api_administrator_banned_customer_profile(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Register customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerDisplayName = RandomGenerator.name();
  const customerPhoneNumber = RandomGenerator.mobile();
  const customerAuth = await authorize_member_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      display_name: customerDisplayName,
      phone_number: customerPhoneNumber,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerAuth);
  const customerId: string & tags.Format<"uuid"> = customerAuth.id;
  // 3. Administrator login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminAuth.token.access,
      ip: typia.random<string & tags.Format<"ipv4">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdministrator.ILogin,
  });
  // 4. Customer login to verify customer can login
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.ILogin,
  });
  // 5. Administrator ban customer
  const banCreateConnection: api.IConnection = { host: connection.host };
  const banResult =
    await generate_random_ecommerce_mall_administrator_user_bans_create(
      banCreateConnection,
      {
        body: {
          user_type: "customer" as const,
          customer_id: customerId,
          reason: "Test ban for E2E testing - policy violation",
        },
      },
    );
  typia.assert(banResult);
  // 6. Administrator retrieve banned customer profile
  const retrieveConnection: api.IConnection = { host: connection.host };
  const customerProfile =
    await api.functional.ecommerceMall.administrator.customers.at(
      retrieveConnection,
      {
        customerId: customerId,
      },
    );
  typia.assert(customerProfile);
  // 7. Validate customer profile fields
  TestValidator.equals("customer id matches", customerProfile.id, customerId);
  TestValidator.equals(
    "customer email matches",
    customerProfile.email,
    customerEmail,
  );
  TestValidator.equals(
    "display name matches",
    customerProfile.display_name,
    customerDisplayName,
  );
  TestValidator.equals(
    "phone number matches",
    customerProfile.phone_number,
    customerPhoneNumber,
  );
  TestValidator.predicate(
    "created at is valid date-time",
    customerProfile.created_at.includes("T"),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    customerProfile.updated_at.includes("T"),
  );
  // 8. Verify customer can still be viewed by administrator after ban
  TestValidator.equals(
    "banned customer profile accessible",
    customerProfile.id,
    customerId,
  );
}
