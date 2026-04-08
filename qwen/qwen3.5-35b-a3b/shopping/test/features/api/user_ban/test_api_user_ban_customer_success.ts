import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_mall_super_administrator_user_bans_create } from "../../../generate/generate_random_ecommerce_mall_super_administrator_user_bans_create";
import { prepare_random_ecommerce_mall_user_ban } from "../../../prepare/prepare_random_ecommerce_mall_user_ban";

/**
 * Test the primary success path for banning a customer account as a super administrator.
 *
 * Validates the complete ban creation workflow including super administrator registration,
 * customer account creation, ban creation with business reason validation, and enforcement
 * verification through authentication rejection. Ensures that ban records are properly
 * stored in both the main bans table and customer-specific subtype table, with complete
 * audit trail including administrator identity and timestamps.
 *
 * Special attention is given to verifying that the ban is immediately enforced by
 * rejecting the banned customer's login attempt, while preserving the ban record structure
 * with all required fields including reason, timestamps, and user type discriminator.
 *
 * 1. Super administrator registers with email, display_name, and password via POST /ecommerceMall/auth/super-administrator/join.
 * 2. Super administrator receives authentication tokens (access, refresh, expired_at).
 * 3. Customer registers with email, password, and optional display_name via POST /ecommerceMall/auth/member/join.
 * 4. Customer account exists in active state (not banned, deleted_at is null).
 * 5. Super administrator creates ban via POST /ecommerceMall/superAdministrator/user-bans with user_type: 'customer', customer_id, and business reason.
 * 6. System validates ban creation: customer exists, is not already banned, reason is valid (1-500 chars).
 * 7. System creates ban record in ecommerce_mall_user_bans table with all timestamps and administrator reference.
 * 8. System creates customer ban subtype record in ecommerce_mall_user_ban_of_customers table.
 * 9. Ban response is validated: id (UUID), user_type ('customer'), customerBan reference, sellerBan (null), reason, timestamps, deleted_at (null).
 * 10. Customer login is attempted with valid credentials and expected to fail with 401 Unauthorized due to ban status.
 */
export async function test_api_user_ban_customer_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(adminJoin);
  // 2. Register customer to be banned
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customerJoin);
  const customerId = customerJoin.id;
  // 3. Create ban for customer
  const ban =
    await generate_random_ecommerce_mall_super_administrator_user_bans_create(
      adminConnection,
      {
        body: {
          user_type: "customer" as const,
          customer_id: customerId,
          reason: "Violated platform terms of service",
        },
      },
    );
  typia.assert(ban);
  // 4. Validate ban response structure
  TestValidator.equals("ban user_type", ban.user_type, "customer");
  TestValidator.equals(
    "ban reason",
    ban.reason,
    "Violated platform terms of service",
  );
  TestValidator.equals("ban deleted_at", ban.deleted_at, null);
  TestValidator.equals(
    "ban customerBan exists",
    ban.customerBan !== null,
    true,
  );
  TestValidator.equals("ban sellerBan is null", ban.sellerBan, null);
  // 5. Validate customerBan reference structure
  typia.assert(ban.customerBan);
  TestValidator.equals(
    "customerBan id matches",
    ban.customerBan.id,
    customerId,
  );
  TestValidator.equals(
    "customerBan email matches",
    ban.customerBan.customer.email,
    customerJoin.email,
  );
  // 6. Validate ban contains administrator reference
  typia.assert(ban.administrator);
  TestValidator.equals(
    "administrator display_name matches",
    ban.administrator.displayName,
    adminJoin.superAdministrator.display_name,
  );
  // 7. Verify ban takes effect: customer cannot login after ban
  const customerLogin: IEcommerceMallMember.ILogin = {
    email: customerJoin.email,
    password: customerPassword,
    href: "https://test.com/login",
    referrer: "https://test.com",
  };
  await TestValidator.error("customer banned cannot login", async () => {
    await api.functional.ecommerceMall.auth.member.login(customerConnection, {
      body: customerLogin,
    });
  });
}
