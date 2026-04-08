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

export async function test_api_customer_ban_subtype_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IEcommerceMallSuperAdministrator.IAuthorized =
    await authorize_super_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        display_name: RandomGenerator.name(2),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSuperAdministrator.IJoin,
    });
  // 2. Retrieve a customer ban subtype record (pre-seeded in test database)
  const banOfCustomerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const ban: IEcommerceMallUserBanOfCustomer =
    await api.functional.ecommerceMall.superAdministrator.user_ban_of_customers.at(
      adminConnection,
      { banOfCustomerId },
    );
  typia.assert(ban);
  // 3. Validate ban ID matches request
  TestValidator.equals("ban ID matches request", ban.id, banOfCustomerId);
  // 4. Validate ban is active (deleted_at is NULL)
  TestValidator.equals(
    "ban is active (deleted_at is null)",
    ban.deleted_at,
    null,
  );
  // 5. Validate ban status derivation (deleted_at NULL → 'active')
  TestValidator.equals(
    "ban status is active when deleted_at is null",
    ban.ban.ban_status,
    "active",
  );
  // 6. Validate customer reference structure
  typia.assert(ban.customer);
  TestValidator.equals(
    "customer ID is valid UUID",
    ban.customer.id,
    ban.customer.id,
  );
  TestValidator.equals(
    "customer email format",
    ban.customer.email,
    ban.customer.email,
  );
  TestValidator.predicate(
    "customer display_name is string or null",
    ban.customer.display_name === null ||
      typeof ban.customer.display_name === "string",
  );
  TestValidator.predicate(
    "customer phone_number is string or null",
    ban.customer.phone_number === null ||
      typeof ban.customer.phone_number === "string",
  );
  TestValidator.equals(
    "customer created_at is present",
    ban.customer.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "customer updated_at is present",
    ban.customer.updated_at !== undefined,
    true,
  );
  TestValidator.predicate(
    "customer deleted_at is string or null",
    ban.customer.deleted_at === null ||
      typeof ban.customer.deleted_at === "string",
  );
  // 7. Validate ban metadata structure
  typia.assert(ban.ban);
  TestValidator.equals(
    "ban user_type is customer",
    ban.ban.user_type,
    "customer",
  );
  TestValidator.equals(
    "ban reason is present",
    ban.ban.reason !== undefined,
    true,
  );
  TestValidator.equals(
    "banned_at is present",
    ban.ban.banned_at !== undefined,
    true,
  );
  TestValidator.equals(
    "ban created_at is present",
    ban.ban.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "ban updated_at is present",
    ban.ban.updated_at !== undefined,
    true,
  );
  TestValidator.equals("ban ID is present", ban.ban.id !== undefined, true);
  // 8. Validate ban status matches deletion state
  const expectedStatus = ban.deleted_at === null ? "active" : "completed";
  TestValidator.equals(
    "ban_status matches deleted_at state",
    ban.ban.ban_status,
    expectedStatus,
  );
  // 9. Validate administrator reference structure
  typia.assert(ban.ban.administrator);
  TestValidator.equals(
    "administrator ID is present",
    ban.ban.administrator.id !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator email is present",
    ban.ban.administrator.email !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator displayName is present",
    ban.ban.administrator.displayName !== undefined,
    true,
  );
  TestValidator.predicate(
    "administrator grade is valid",
    ban.ban.administrator.grade === null ||
      ban.ban.administrator.grade === "regular" ||
      ban.ban.administrator.grade === "super",
  );
  TestValidator.equals(
    "administrator isBanned is boolean",
    typeof ban.ban.administrator.isBanned === "boolean",
    true,
  );
  TestValidator.equals(
    "administrator createdAt is present",
    ban.ban.administrator.createdAt !== undefined,
    true,
  );
  TestValidator.equals(
    "administrator updatedAt is present",
    ban.ban.administrator.updatedAt !== undefined,
    true,
  );
  TestValidator.predicate(
    "administrator deletedAt is string or null",
    ban.ban.administrator.deletedAt === null ||
      typeof ban.ban.administrator.deletedAt === "string",
  );
  // 10. Validate subtype timestamps
  TestValidator.equals(
    "subtype created_at is present",
    ban.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "subtype updated_at is present",
    ban.updated_at !== undefined,
    true,
  );
  // 11. Validate timestamp ordering for customer
  TestValidator.predicate(
    "customer created_at <= updated_at",
    new Date(ban.customer.created_at) <= new Date(ban.customer.updated_at),
  );
  // 12. Validate timestamp ordering for ban
  TestValidator.predicate(
    "ban created_at <= updated_at",
    new Date(ban.ban.created_at) <= new Date(ban.ban.updated_at),
  );
  // 13. Validate all nested structures are complete
  TestValidator.predicate(
    "customer has all required fields",
    ban.customer.id !== undefined &&
      ban.customer.email !== undefined &&
      ban.customer.created_at !== undefined &&
      ban.customer.updated_at !== undefined,
  );
  TestValidator.predicate(
    "ban has all required fields",
    ban.ban.id !== undefined &&
      ban.ban.user_type !== undefined &&
      ban.ban.reason !== undefined &&
      ban.ban.banned_at !== undefined &&
      ban.ban.ban_status !== undefined &&
      ban.ban.administrator.id !== undefined,
  );
}