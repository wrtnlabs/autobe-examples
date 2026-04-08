import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test partial seller profile update where only shop_name is modified.
 *
 * Validates that when a seller updates only the shop_name field in their profile, the system correctly preserves unchanged fields (shop_description and logo_uri) while updating the modified field. The test verifies that partial updates work correctly without overwriting existing data with null or undefined values.
 *
 * Special attention is given to ensuring that:
 * - Only the shop_name field changes to the new value
 * - shop_description retains its original value from initial setup
 * - logo_uri retains its original value (null or URI) from initial setup
 * - updated_at timestamp is modified to reflect the update
 * - The complete profile is returned with all fields preserved
 *
 * 1. Register a new seller customer
 * 2. Initialize seller profile with complete data (shop_name, shop_description, logo_uri)
 * 3. Capture the original profile values and updated_at timestamp
 * 4. Update only the shop_name field (omit shop_description and logo_uri)
 * 5. Verify shop_name is updated to the new value
 * 6. Verify shop_description and logo_uri remain unchanged
 * 7. Verify updated_at timestamp has been modified
 */
export async function test_api_seller_profile_partial_update_shop_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller customer
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // 2. Initialize seller profile with complete data
  const initialShopName = RandomGenerator.paragraph({ sentences: 2 });
  const initialShopDescription = RandomGenerator.paragraph({ sentences: 5 });
  const initialLogoUri: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const initialProfile =
    await api.functional.shoppingMall.customer.profile.update(
      sellerConnection,
      {
        body: {
          shop_name: initialShopName,
          shop_description: initialShopDescription,
          logo_uri: initialLogoUri,
        } satisfies IShoppingMallSellerProfile.IUpdate,
      },
    );
  typia.assert(initialProfile);
  // Capture original profile values
  const originalUpdatedAt = initialProfile.updated_at;
  // 3. Generate new shop name for partial update
  const newShopName = RandomGenerator.paragraph({ sentences: 3 });
  // 4. Update only shop_name (partial update - omit shop_description and logo_uri)
  const updatedProfile =
    await api.functional.shoppingMall.customer.profile.update(
      sellerConnection,
      {
        body: {
          shop_name: newShopName,
        } satisfies IShoppingMallSellerProfile.IUpdate,
      },
    );
  typia.assert(updatedProfile);
  // 5. Verify shop_name is updated to new value
  TestValidator.equals(
    "shop_name updated",
    updatedProfile.shop_name,
    newShopName,
  );
  TestValidator.notEquals(
    "shop_name changed from original",
    updatedProfile.shop_name,
    initialShopName,
  );
  // 6. Verify shop_description is preserved (not set to null or undefined)
  TestValidator.equals(
    "shop_description preserved",
    updatedProfile.shop_description,
    initialShopDescription,
  );
  // 7. Verify logo_uri is preserved (not set to null or undefined)
  TestValidator.equals(
    "logo_uri preserved",
    updatedProfile.logo_uri,
    initialLogoUri,
  );
  // 8. Verify updated_at timestamp has been modified
  TestValidator.notEquals(
    "updated_at timestamp modified",
    updatedProfile.updated_at,
    originalUpdatedAt,
  );
  // 9. Verify other profile fields remain intact
  TestValidator.equals(
    "profile id unchanged",
    updatedProfile.id,
    initialProfile.id,
  );
  TestValidator.equals(
    "approval_status unchanged",
    updatedProfile.approval_status,
    initialProfile.approval_status,
  );
  TestValidator.equals(
    "is_suspended unchanged",
    updatedProfile.is_suspended,
    initialProfile.is_suspended,
  );
  TestValidator.equals(
    "is_banned unchanged",
    updatedProfile.is_banned,
    initialProfile.is_banned,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedProfile.created_at,
    initialProfile.created_at,
  );
  TestValidator.equals(
    "deleted_at unchanged",
    updatedProfile.deleted_at,
    initialProfile.deleted_at,
  );
  TestValidator.equals(
    "rejection_reason unchanged",
    updatedProfile.rejection_reason,
    initialProfile.rejection_reason,
  );
}
