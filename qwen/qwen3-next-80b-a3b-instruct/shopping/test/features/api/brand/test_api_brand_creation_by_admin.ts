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
export async function test_api_brand_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate
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
  typia.assert(admin);
  // Step 2: Create a new brand using the authenticated admin connection
  const brandName = RandomGenerator.name();
  const brand: IShoppingMallProductBrand =
    await api.functional.shoppingMall.admin.brands.create(adminConnection, {
      body: {
        name: brandName,
      } satisfies IShoppingMallProductBrand.ICreate,
    });
  typia.assert(brand);
  // Step 3: Validate brand creation response with essential business logic only
  TestValidator.equals("brand name matches input", brand.name, brandName);
  TestValidator.equals("brand status is active", brand.status, "active");
  TestValidator.equals("brand is_verified is false", brand.is_verified, false);
  TestValidator.predicate("brand has non-empty UUID id", brand.id.length > 0);
  TestValidator.predicate("brand has non-empty code", brand.code.length > 0);
  // Step 4: Verify brand unique name constraint (business logic test)
  await TestValidator.error("duplicate brand name should fail", async () => {
    await api.functional.shoppingMall.admin.brands.create(adminConnection, {
      body: {
        name: brandName,
      } satisfies IShoppingMallProductBrand.ICreate,
    });
  });
}
