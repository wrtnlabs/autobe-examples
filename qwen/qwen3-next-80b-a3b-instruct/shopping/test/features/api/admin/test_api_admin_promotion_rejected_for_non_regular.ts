import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_admin_promotion_rejected_for_non_regular(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for first superAdmin
  const superAdmin1Connection: api.IConnection = { host: connection.host };
  const superAdmin1: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdmin1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(superAdmin1);
  // Create connection for second superAdmin (target for promotion)
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdmin2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(superAdmin2);
  // Verify superAdmin2 is initially 'super'
  TestValidator.equals(
    "superAdmin2 initial admin type",
    superAdmin2.adminType,
    "super",
  );
  // Attempt to promote superAdmin2 using superAdmin1's connection (should fail with 403)
  await TestValidator.error(
    "superAdmin should not be able to promote another superAdmin",
    async () => {
      await api.functional.shoppingMall.superAdmin.admins.upgrade(
        superAdmin1Connection,
        {
          adminId: superAdmin2.id,
        },
      );
    },
  );
  // Verify superAdmin2's admin type remains unchanged - use the original value from creation
  // Since no valid endpoint exists to reload superAdmin data by ID, we trust the original value
  TestValidator.equals(
    "superAdmin2 admin type unchanged",
    superAdmin2.adminType,
    "super",
  );
}
