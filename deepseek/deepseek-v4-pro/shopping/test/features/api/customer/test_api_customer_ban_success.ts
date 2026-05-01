import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
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

/**
 * Test successful customer ban by an administrator.
 *
 * Validates the complete customer ban workflow where an administrator bans
 * an active customer account. The test creates both an administrator and a
 * customer account, then the administrator bans the customer by their ID.
 *
 * The ban operation is verified by confirming that the banned_at timestamp
 * is set to a non-null value immediately after the operation. Additional
 * validation ensures that the customer's core identity fields — email,
 * display_name, phone_number, created_at, and deleted_at — remain unchanged
 * after the ban is applied. Only banned_at and updated_at are expected to
 * be modified by this operation.
 *
 * 1. Administrator joins the platform (register and authenticate).
 * 2. Customer joins the platform, creating an active, non-banned account.
 * 3. Administrator bans the customer by their ID.
 * 4. Validates banned_at is non-null and other fields are preserved.
 */
export async function test_api_customer_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {});
  // 3. Ban the customer
  const bannedCustomer = await api.functional.shoppingMall.admin.customers.ban(
    adminConnection,
    { customerId: customerAuth.id },
  );
  typia.assert(bannedCustomer);
  // 4. Validate ban applied
  TestValidator.predicate(
    "banned_at is set",
    bannedCustomer.banned_at !== null,
  );
  // 5. Validate other fields unchanged
  TestValidator.equals(
    "email unchanged",
    bannedCustomer.email,
    customerAuth.email,
  );
  TestValidator.equals(
    "display_name unchanged",
    bannedCustomer.display_name,
    customerAuth.display_name,
  );
  TestValidator.equals(
    "phone_number unchanged",
    bannedCustomer.phone_number,
    customerAuth.phone_number,
  );
  TestValidator.equals(
    "created_at unchanged",
    bannedCustomer.created_at,
    customerAuth.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    bannedCustomer.deleted_at,
    customerAuth.deleted_at,
  );
}
