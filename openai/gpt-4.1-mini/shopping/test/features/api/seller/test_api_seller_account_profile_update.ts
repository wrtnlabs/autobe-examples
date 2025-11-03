import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_seller_account_profile_update(
  connection: api.IConnection,
) {
  // 1. Seller authenticates by joining
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "P@ssw0rd123";
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Admin authenticates by joining for role assignment
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminP@ss123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 3. Create seller profile associated with authenticated seller
  const profileCreateBody = {
    shopping_mall_seller_id: seller.id,
    store_name: seller.store_name,
    contact_email: seller.email,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } satisfies IShoppingMallSellerProfile.ICreate;

  const profile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: profileCreateBody,
    });
  typia.assert(profile);

  // 4. Assign seller role to authenticated seller
  const roleAssignBody = {
    user_id: seller.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole = await api.functional.shoppingMall.admin.userRoles.create(
    connection,
    {
      body: roleAssignBody,
    },
  );
  typia.assert(userRole);

  // 5. Perform the seller profile update with modified email, store_name, and password_hash
  const newEmail = typia.random<string & tags.Format<"email">>();
  const newStoreName = `${seller.store_name} Updated`;
  const newPasswordHash = typia.random<string>();

  const updatedSeller = await api.functional.shoppingMall.seller.sellers.update(
    connection,
    {
      id: seller.id,
      body: {
        email: newEmail,
        store_name: newStoreName,
        password_hash: newPasswordHash,
      } satisfies IShoppingMallSeller.IUpdate,
    },
  );
  typia.assert(updatedSeller);

  // Validate updated fields match
  TestValidator.equals("updated email matches", updatedSeller.email, newEmail);
  TestValidator.equals(
    "updated store_name matches",
    updatedSeller.store_name,
    newStoreName,
  );
  TestValidator.equals(
    "updated password_hash matches",
    updatedSeller.password_hash,
    newPasswordHash,
  );

  // 6. Verify unauthorized update attempt by another seller is denied
  // Authenticate another seller
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSellerPassword = "OtherP@ss456";
  const otherSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: otherSellerEmail,
        password: otherSellerPassword,
        store_name: RandomGenerator.name(2),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(otherSeller);

  // Attempt to update the first seller's profile with other seller's credentials
  await TestValidator.error(
    "unauthorized seller profile update should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellers.update(connection, {
        id: seller.id,
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          store_name: RandomGenerator.name(2),
          password_hash: typia.random<string>(),
        } satisfies IShoppingMallSeller.IUpdate,
      });
    },
  );
}
