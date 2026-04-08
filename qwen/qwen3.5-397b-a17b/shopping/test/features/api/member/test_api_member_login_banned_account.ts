import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test login attempt with a banned member account.
 *
 * Verifies that when an administrator bans a customer account, subsequent login attempts are rejected. First creates a member account, then creates an administrator account, has the administrator ban the member account using the admin member update operation, then attempts to login with the banned account's credentials. Validates that the system correctly prevents banned users from accessing the platform while preserving their order history and data. This tests the account security business rule where administrators can restrict user access.
 *
 * 1. Create a member account with unique email and password credentials using authorize_member_join utility.
 * 2. Create an administrator account with unique email and password using authorize_admin_join utility.
 * 3. Login as administrator to get authenticated admin connection.
 * 4. Admin updates the member account status to 'banned' using api.functional.shoppingMall.admin.members.update.
 * 5. Attempt to login with the banned member's credentials using authorize_member_login.
 * 6. Validate that login attempt fails (banned accounts cannot login).
 * 7. Verify the member account status is 'banned' and deleted_at is set.
 */
export async function test_api_member_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallMember.IJoin;
  const memberAuth = await authorize_member_join(connection, {
    body: memberCredentials,
  });
  typia.assert(memberAuth);
  // 2. Create administrator account
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    grade: "regular" as const,
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(connection, {
    body: adminCredentials,
  });
  typia.assert(adminAuth);
  // 3. Login as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminCredentials.email,
      password: adminCredentials.password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // 4. Admin bans the member account
  const bannedMember = await api.functional.shoppingMall.admin.members.update(
    adminConnection,
    {
      memberId: memberAuth.id,
      body: {
        status: "banned",
      } satisfies IShoppingMallMember.IUpdate,
    },
  );
  typia.assert(bannedMember);
  // Verify member is banned
  TestValidator.equals(
    "member status is banned",
    bannedMember.status,
    "banned",
  );
  TestValidator.predicate(
    "deleted_at is set",
    bannedMember.deleted_at !== null,
  );
  // 5. Attempt to login with banned member credentials
  const memberConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("banned member login rejected", async () => {
    await authorize_member_login(memberConnection, {
      body: {
        email: memberCredentials.email,
        password: memberCredentials.password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IShoppingMallMember.ILogin,
    });
  });
}
