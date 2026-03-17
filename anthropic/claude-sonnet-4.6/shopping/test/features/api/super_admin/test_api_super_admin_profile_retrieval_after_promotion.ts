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

export async function test_api_super_admin_profile_retrieval_after_promotion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a super admin account and get authenticated connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2. Create a regular admin account (separate connection, separate actor)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // Get the adminId from the authorized response
  const adminId = adminAuth.id;
  // 3. As super admin, promote the regular admin to super admin
  const promotedSuperAdmin =
    await api.functional.shoppingMall.superAdmin.admins.promote(
      superAdminConnection,
      {
        adminId: adminId,
      },
    );
  typia.assert(promotedSuperAdmin);
  // Note the superAdminId from the promote response
  const superAdminId = promotedSuperAdmin.id;
  // 4. Retrieve the full profile of the newly promoted super admin
  const retrievedSuperAdmin =
    await api.functional.shoppingMall.superAdmin.superAdmins.at(
      superAdminConnection,
      {
        superAdminId: superAdminId,
      },
    );
  typia.assert(retrievedSuperAdmin);
  // 5. Validate business logic assertions
  // Assert the id in the response matches the superAdminId used as the path parameter
  TestValidator.equals(
    "super admin id matches",
    retrievedSuperAdmin.id,
    superAdminId,
  );
  // Assert deleted_at is null, confirming the newly promoted account is active
  TestValidator.equals(
    "deleted_at is null for active account",
    retrievedSuperAdmin.deleted_at,
    null,
  );
}
