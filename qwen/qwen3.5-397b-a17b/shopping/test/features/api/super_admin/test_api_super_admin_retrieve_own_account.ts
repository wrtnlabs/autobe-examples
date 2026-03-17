import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_retrieve_own_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator account
  const authorized = await authorize_super_admin_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2. Create super admin-specific connection with authentication token
  const superAdminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 3. Retrieve own account details using the super admin's own ID
  const account = await api.functional.shoppingMall.superAdmin.super_admins.at(
    superAdminConnection,
    {
      superAdminId: authorized.id,
    },
  );
  typia.assert(account);
  // 4. Validate account details match the registered information
  TestValidator.equals("super admin id matches", account.id, authorized.id);
  TestValidator.equals("email matches", account.email, authorized.email);
  // 5. Validate timestamps are reasonable (created_at should be recent)
  TestValidator.predicate("created_at is valid date-time", () => {
    const createdAt = new Date(account.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdAt.getTime();
    return timeDiff >= 0 && timeDiff < 5 * 60 * 1000;
  });
  TestValidator.predicate("updated_at is valid date-time", () => {
    const updatedAt = new Date(account.updated_at);
    const now = new Date();
    const timeDiff = now.getTime() - updatedAt.getTime();
    return timeDiff >= 0 && timeDiff < 5 * 60 * 1000;
  });
  // 6. Validate updated_at is not before created_at
  TestValidator.predicate("updated_at not before created_at", () => {
    const createdAt = new Date(account.created_at);
    const updatedAt = new Date(account.updated_at);
    return updatedAt >= createdAt;
  });
}
