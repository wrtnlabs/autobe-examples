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
export async function test_api_brand_status_transition_to_disabled(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin-specific connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a brand with active status using the generation function
  const brand = await generate_random_shopping_mall_admin_brands_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallProductBrand.ICreate,
    },
  );
  typia.assert(brand);
  TestValidator.equals(
    "brand created with active status",
    brand.status,
    "active",
  );
  // Step 3: Update the brand status to 'disabled'
  const updatedBrand = await api.functional.shoppingMall.admin.brands.update(
    adminConnection,
    {
      brandId: brand.id,
      body: { status: "disabled" } satisfies IShoppingMallProductBrand.IUpdate,
    },
  );
  typia.assert(updatedBrand);
  // Step 4: Validate status was updated to 'disabled'
  TestValidator.equals(
    "brand status updated to disabled",
    updatedBrand.status,
    "disabled",
  );
  // Step 5: Verify that attempting to modify the brand again fails with 403 Forbidden
  await TestValidator.error("cannot update disabled brand", async () => {
    await api.functional.shoppingMall.admin.brands.update(adminConnection, {
      brandId: brand.id,
      body: { status: "active" } satisfies IShoppingMallProductBrand.IUpdate,
    });
  });
}
