import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_profile_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  const originalAdmin = adminAuth.admin;
  const adminId = originalAdmin.id;
  // 3. Full update: email + password
  const newEmail1 = typia.random<string & tags.Format<"email">>();
  const newPassword1 = typia.random<string & tags.Format<"password">>();
  const updatedAdmin1 =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId,
        body: {
          email: newEmail1,
          password: newPassword1,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin1);
  // Validate full update results
  TestValidator.equals("email updated", updatedAdmin1.email, newEmail1);
  TestValidator.equals("grade remains regular", updatedAdmin1.grade, "regular");
  TestValidator.equals("deleted_at is null", updatedAdmin1.deleted_at, null);
  TestValidator.equals("id unchanged", updatedAdmin1.id, adminId);
  TestValidator.equals(
    "actor_type unchanged",
    updatedAdmin1.actor_type,
    originalAdmin.actor_type,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedAdmin1.created_at,
    originalAdmin.created_at,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedAdmin1.updated_at,
    originalAdmin.updated_at,
  );
  // 4. Email-only update
  const newEmail2 = typia.random<string & tags.Format<"email">>();
  const updatedAdmin2 =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId,
        body: {
          email: newEmail2,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin2);
  // Validate email-only update
  TestValidator.equals(
    "email updated (email-only)",
    updatedAdmin2.email,
    newEmail2,
  );
  TestValidator.equals(
    "grade remains regular (email-only)",
    updatedAdmin2.grade,
    "regular",
  );
  TestValidator.equals(
    "deleted_at still null (email-only)",
    updatedAdmin2.deleted_at,
    null,
  );
  TestValidator.equals("id unchanged (email-only)", updatedAdmin2.id, adminId);
  TestValidator.notEquals(
    "updated_at refreshed (email-only)",
    updatedAdmin2.updated_at,
    updatedAdmin1.updated_at,
  );
  // 5. Password-only update
  const newPassword3 = typia.random<string & tags.Format<"password">>();
  const updatedAdmin3 =
    await api.functional.shoppingMall.superAdmin.admins.update(
      superAdminConnection,
      {
        adminId,
        body: {
          password: newPassword3,
        } satisfies IShoppingMallAdmin.IUpdate,
      },
    );
  typia.assert(updatedAdmin3);
  // Validate password-only update: email remains as newEmail2
  TestValidator.equals(
    "email unchanged (password-only)",
    updatedAdmin3.email,
    newEmail2,
  );
  TestValidator.equals(
    "grade remains regular (password-only)",
    updatedAdmin3.grade,
    "regular",
  );
  TestValidator.equals(
    "deleted_at still null (password-only)",
    updatedAdmin3.deleted_at,
    null,
  );
  TestValidator.equals(
    "id unchanged (password-only)",
    updatedAdmin3.id,
    adminId,
  );
}
