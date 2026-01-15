import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductBrand";
import { prepare_random_shopping_mall_product_brand } from "../../../prepare/prepare_random_shopping_mall_product_brand";
import { generate_random_shopping_mall_admin_brands_create } from "../../../generate/generate_random_shopping_mall_admin_brands_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_brand_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  // Step 2: Create a brand to update using the utility function
  const createdBrand: IShoppingMallProductBrand =
    await generate_random_shopping_mall_admin_brands_create(adminConnection, {
      body: {
        name: "Original Brand", // Set initial name as specified in scenario
      } satisfies IShoppingMallProductBrand.ICreate,
    });
  typia.assert(createdBrand);
  // Store original values for comparison
  const originalName = createdBrand.name;
  const originalUpdatedAt = createdBrand.updated_at;
  // Step 3: Prepare update data with new description and logo URL
  // Only update description and logo_url as specified in scenario
  // Keep other fields unchanged (partial update semantics)
  const updateData = {
    description: "Updated brand description with new information",
    logo_url: "https://example.com/new-logo.png",
  } satisfies IShoppingMallProductBrand.IUpdate;
  // Step 4: Update the brand using the specific API endpoint
  const updatedBrand: IShoppingMallProductBrand =
    await api.functional.shoppingMall.admin.brands.update(
      adminConnection, // Use adminConnection, not base connection
      {
        brandId: createdBrand.id,
        body: updateData,
      },
    );
  typia.assert(updatedBrand);
  // Step 5: Validate that the brand's updated_at timestamp is modified (changed from original)
  TestValidator.notEquals(
    "updated_at timestamp changed after update",
    originalUpdatedAt,
    updatedBrand.updated_at,
  );
  // Step 6: Validate that description is changed to the new value
  TestValidator.equals(
    "description updated to new value",
    updatedBrand.description,
    "Updated brand description with new information",
  );
  // Step 7: Validate that logo_url is updated to the new value
  TestValidator.equals(
    "logo_url updated to new value",
    updatedBrand.logo_url,
    "https://example.com/new-logo.png",
  );
  // Step 8: Validate that name remains unchanged (partial update semantics)
  TestValidator.equals(
    "name unchanged during partial update",
    updatedBrand.name,
    originalName,
  );
}
