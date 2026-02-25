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

export async function test_api_product_subcategory_creation_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication (join and authorize)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: { password: "A1b2C3d4E5f6G7h8" },
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };

  // 2. Directly generate a random UUID to simulate productCategoryId
  // because no category creation API is available and partial ISummary object is invalid
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();

  // 3. Create first product subcategory with unique name
  const subcategoryName = RandomGenerator.name(2);
  const subcategoryDescription = RandomGenerator.paragraph({ sentences: 2 });
  const body = {
    name: subcategoryName,
    description: subcategoryDescription,
  } satisfies IShoppingMallProductSubcategory.ICreate;

  const firstSubcategory = await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
    adminConnection,
    {
      params: { productCategoryId },
      body: body,
    },
  );
  typia.assert(firstSubcategory);

  // 4. Try to create second subcategory with the same name under the same productCategoryId
  const duplicateBody = {
    name: subcategoryName, // duplicate name
    description: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallProductSubcategory.ICreate;

  await TestValidator.httpError(
    "duplicate subcategory name conflict",
    409,
    async () => {
      await generate_random_shopping_mall_administrator_product_categories_subcategories_create_subcategory(
        adminConnection,
        {
          params: { productCategoryId },
          body: duplicateBody,
        },
      );
    },
  );

  // 5. Validate the properties of the first subcategory
  TestValidator.equals(
    "subcategory name equality",
    firstSubcategory.name,
    subcategoryName,
  );
  TestValidator.equals(
    "subcategory description equality",
    firstSubcategory.description,
    subcategoryDescription,
  );
  TestValidator.predicate(
    "subcategory category id equality",
    firstSubcategory.category.id === productCategoryId,
  );
}
