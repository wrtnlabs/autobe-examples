import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdministrator";
import type { IEcommerceMallUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBan";
import type { IEcommerceMallUserBanOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUserBanOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_customer_ban_subtype_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      display_name: RandomGenerator.name(2),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    } satisfies IEcommerceMallSuperAdministrator.IJoin,
  });
  // 2. Retrieve an active customer ban subtype record
  const banOfCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const banRecord =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.at(
      superAdminConnection,
      { banOfCustomerId },
    );
  typia.assert(banRecord);
  // 3. Validate customer details
  const customer = banRecord.customer;
  typia.assert(customer.id);
  typia.assert(customer.email);
  typia.assert(customer.created_at);
  typia.assert(customer.updated_at);
  typia.assert(customer.deleted_at);
  // 4. Validate ban metadata
  const ban = banRecord.ban;
  typia.assert(ban.id);
  typia.assert(ban.banned_at);
  typia.assert(ban.created_at);
  typia.assert(ban.updated_at);
  // Validate user_type is 'customer'
  TestValidator.equals("ban user_type is customer", ban.user_type, "customer");
  // Validate ban_status is 'active' for active ban
  TestValidator.equals("ban_status is active", ban.ban_status, "active");
  // Validate reason is not empty
  TestValidator.predicate("ban has reason", ban.reason.length > 0);
  // 5. Validate administrator reference
  const administrator = ban.administrator;
  typia.assert(administrator.id);
  typia.assert(administrator.email);
  typia.assert(administrator.displayName);
  typia.assert(administrator.createdAt);
  typia.assert(administrator.updatedAt);
  typia.assert(administrator.deletedAt);
  typia.assert(administrator.isBanned);
  // 6. Validate record timestamps
  typia.assert(banRecord.created_at);
  typia.assert(banRecord.updated_at);
  // Validate deleted_at is NULL for active ban
  TestValidator.equals(
    "active ban has deleted_at as null",
    banRecord.deleted_at,
    null,
  );
  // 7. Validate customer phone_number can be null
  TestValidator.predicate(
    "customer phone_number is null or string",
    customer.phone_number === null || typeof customer.phone_number === "string",
  );
  // 8. Validate customer display_name can be null
  TestValidator.predicate(
    "customer display_name is null or string",
    customer.display_name === null || typeof customer.display_name === "string",
  );
}
