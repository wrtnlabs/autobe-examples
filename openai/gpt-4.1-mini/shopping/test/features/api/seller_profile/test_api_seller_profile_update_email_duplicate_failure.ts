import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

export async function test_api_seller_profile_update_email_duplicate_failure(
  connection: api.IConnection,
) {
  // 1. First seller join
  const seller1Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: seller1Email,
        password: "Password123!",
        store_name: typia.random<string>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller1);

  // 2. Create first seller profile
  const sellerProfile1: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: {
        shopping_mall_seller_id: seller1.id,
        store_name: seller1.store_name,
        business_registration_number: "123-45-67890",
        contact_email: seller1Email,
        contact_phone: null,
        profile_description: "First seller profile for testing.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      } satisfies IShoppingMallSellerProfile.ICreate,
    });
  typia.assert(sellerProfile1);

  // 3. Second seller join
  const seller2Email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: seller2Email,
        password: "Password123!",
        store_name: typia.random<string>(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller2);

  // 4. Create second seller profile
  const sellerProfile2: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: {
        shopping_mall_seller_id: seller2.id,
        store_name: seller2.store_name,
        business_registration_number: "987-65-43210",
        contact_email: seller2Email,
        contact_phone: null,
        profile_description: "Second seller profile for duplicate email test.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      } satisfies IShoppingMallSellerProfile.ICreate,
    });
  typia.assert(sellerProfile2);

  // 5. Attempt to update sellerProfile2's contact_email to seller1's email - expect error
  await TestValidator.error(
    "update sellerProfile2 contact_email to seller1 contact_email should fail",
    async () => {
      await api.functional.shoppingMall.seller.sellerProfiles.update(
        connection,
        {
          id: sellerProfile2.id,
          body: {
            contact_email: sellerProfile1.contact_email,
          } satisfies IShoppingMallSellerProfile.IUpdate,
        },
      );
    },
  );
}
