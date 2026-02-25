import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory";
import { prepare_random_shopping_mall_product_subcategory } from "../../../prepare/prepare_random_shopping_mall_product_subcategory";

export async function test_api_product_subcategory_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. We need an existing product category ID
  //    We'll create a unique product category name and description here by generating a random string, but since no direct API for product category creation is provided,
  //    we need to mock/factory or predefine existance for testing purpose.
  //    Because scenario requires the parent productCategoryId must exist, we must simulate that by generating a product subcategory for a known category or pre-define
  //    a random valid UUID as a temporary category ID to test valid creation.
  // For test, we create a valid UUID for productCategoryId and assume it exists (scenario requirement)
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare the ICreate DTO for subcategory
  const body: IShoppingMallProductSubcategory.ICreate = {
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  };
  // 4. Create the product subcategory using the utility function
  const subcategory =
    await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
      adminConnection,
      {
        params: { productCategoryId },
        body,
      },
    );
  typia.assert(subcategory);
  // 5. Validate returned subcategory fields
  TestValidator.equals(
    "parent category id matches",
    subcategory.category.id,
    productCategoryId,
  );
  TestValidator.equals("name matches", subcategory.name, body.name);
  TestValidator.equals(
    "description matches",
    subcategory.description,
    body.description,
  );
  // 6. Validate timestamps exist and are valid date-time strings
  const createdAtDate = new Date(subcategory.createdAt);
  const updatedAtDate = new Date(subcategory.updatedAt);
  if (!(createdAtDate instanceof Date) || isNaN(createdAtDate.getTime()))
    throw new Error("Invalid createdAt timestamp");
  if (!(updatedAtDate instanceof Date) || isNaN(updatedAtDate.getTime()))
    throw new Error("Invalid updatedAt timestamp");
  // 7. Validate deletedAt is null
  TestValidator.equals("deletedAt is null", subcategory.deletedAt, null);
}
