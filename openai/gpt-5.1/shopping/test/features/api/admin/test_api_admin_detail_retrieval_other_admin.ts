import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_detail_retrieval_other_admin(
  connection: api.IConnection,
) {
  // 1. Create Admin A (governance operator)
  const adminAEmail = typia.random<string & tags.Format<"email">>();
  const password: string & tags.Format<"password"> = "P@ssw0rd!123" as string &
    tags.Format<"password">;
  const adminAJoinBody = {
    email: adminAEmail,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  // 2. Create Admin B using the same connection (now authenticated as Admin A)
  const adminBEmail = typia.random<string & tags.Format<"email">>();
  const adminBJoinBody = {
    email: adminBEmail,
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminBAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  // Sanity check: Admin A and Admin B must be different accounts
  TestValidator.notEquals(
    "admin A and admin B must have different ids",
    adminAAuth.id,
    adminBAuth.id,
  );

  // 3. As the current admin (Admin B after second join), call admin detail for Admin B
  const adminDetailByB: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: adminBAuth.id,
    });
  typia.assert(adminDetailByB);

  // Validate that the detail describes Admin B
  TestValidator.equals(
    "admin detail id must equal admin B id",
    adminDetailByB.id,
    adminBAuth.id,
  );
  TestValidator.equals(
    "admin detail email must equal admin B email",
    adminDetailByB.email,
    adminBAuth.email,
  );

  // Optionally compare some lifecycle fields when available
  TestValidator.equals(
    "admin detail status matches authorized payload",
    adminDetailByB.status,
    adminBAuth.status,
  );
  TestValidator.equals(
    "admin detail email_verified matches authorized payload",
    adminDetailByB.email_verified,
    adminBAuth.email_verified,
  );

  // 4. Attempt unauthenticated access
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated user cannot get admin detail",
    async () => {
      await api.functional.shoppingMall.admin.admins.at(unauthConnection, {
        adminId: adminBAuth.id,
      });
    },
  );

  // 5. Register a customer and attempt access as customer
  const customerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuth: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuth);

  await TestValidator.error(
    "customer actor cannot access admin detail endpoint",
    async () => {
      await api.functional.shoppingMall.admin.admins.at(connection, {
        adminId: adminBAuth.id,
      });
    },
  );

  // 6. Register a seller and attempt access as seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  await TestValidator.error(
    "seller actor cannot access admin detail endpoint",
    async () => {
      await api.functional.shoppingMall.admin.admins.at(connection, {
        adminId: adminBAuth.id,
      });
    },
  );
}
