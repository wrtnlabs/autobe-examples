import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { prepare_random_shopping_mall_admin } from "../../../prepare/prepare_random_shopping_mall_admin";
import { generate_random_shopping_mall_admin_admins_create } from "../../../generate/generate_random_shopping_mall_admin_admins_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_creation_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super-administrator using the authorization function
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(8) + "!Password123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a new admin account using the admin creation endpoint
  const newAdmin: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.create(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(4) + "!StrongPassword123",
          permissions: ["admin:users:read", "admin:orders:edit"].join(","),
        } satisfies IShoppingMallAdmin.ICreate,
      },
    );
  // Step 3: Validate that the new admin account is properly created
  typia.assert(newAdmin);
  TestValidator.equals("new admin has id", newAdmin.id, newAdmin.id);
  TestValidator.equals("new admin has email", newAdmin.email, newAdmin.email);
  TestValidator.equals(
    "new admin has an active status",
    newAdmin.status,
    "active",
  );
  TestValidator.predicate(
    "permissions array has at least one permission",
    newAdmin.permissions.length >= 1,
  );
}