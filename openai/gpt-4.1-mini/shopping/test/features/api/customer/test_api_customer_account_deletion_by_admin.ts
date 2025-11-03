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

export async function test_api_customer_account_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins (register) to obtain authorization token
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "StrongPassword123!",
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Seller user joins (register) to obtain authorization token and seller ID
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "StrongPassword123!",
        store_name: RandomGenerator.name(3),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 3. Create seller profile linked to the seller
  const sellerProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: {
        id: typia.random<string & tags.Format<"uuid">>(),
        shopping_mall_seller_id: seller.id,
        store_name: seller.store_name,
        business_registration_number: null,
        contact_email: seller.email,
        contact_phone: null,
        profile_description: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      } satisfies IShoppingMallSellerProfile.ICreate,
    });
  typia.assert(sellerProfile);

  // 4. Create a user role entry for the seller (pretend customer role assignment)
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: {
        user_id: seller.id,
        role_name: "seller",
      } satisfies IShoppingMallUserRole.ICreate,
    });
  typia.assert(userRole);

  // 5. Admin deletes the customer account by id (seller id here)
  await api.functional.shoppingMall.admin.customers.eraseCustomer(connection, {
    id: seller.id,
  });

  // 6. Try to access the seller profile after deletion to confirm hard delete
  await TestValidator.error(
    "seller profile not found after customer deletion",
    async () => {
      await api.functional.shoppingMall.seller.sellerProfiles.create(
        connection,
        {
          body: {
            id: sellerProfile.id,
            shopping_mall_seller_id: seller.id,
            store_name: seller.store_name,
            business_registration_number: null,
            contact_email: seller.email,
            contact_phone: null,
            profile_description: null,
            created_at: sellerProfile.created_at,
            updated_at: sellerProfile.updated_at,
            deleted_at: null,
          } satisfies IShoppingMallSellerProfile.ICreate,
        },
      );
    },
  );

  // 7. Try to recreate user role for the deleted seller - expect error
  await TestValidator.error(
    "user role creation fails for deleted seller",
    async () => {
      await api.functional.shoppingMall.admin.userRoles.create(connection, {
        body: {
          user_id: seller.id,
          role_name: "seller",
        } satisfies IShoppingMallUserRole.ICreate,
      });
    },
  );
}
