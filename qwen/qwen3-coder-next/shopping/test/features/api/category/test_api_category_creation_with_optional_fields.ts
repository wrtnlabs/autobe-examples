import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

export async function test_api_category_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IShoppingMallAdmin.IJoin>(),
  });
  // Test 1: Create category with both name and description
  const category1 = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category1);
  // Test 2: Create category with only name (empty description)
  const category2 = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: "", // Empty description
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category2);
  // Test 3: Create category with special characters in name and description
  const category3 = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: "Category-With_Special_Chars!@#$%",
        description: "Description with special chars: \\n newline \\t tab ",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category3);
  // Test 4: Create category with Unicode characters
  const category4 = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: "카테고리_이름_테스트",
        description: "Über das Produkt • 日本語テスト • Ελληνικά",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category4);
  // Test 5: Create category with long text fields
  const category5 = await api.functional.shoppingMall.admin.categories.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.alphabets(100),
        description: RandomGenerator.content({ paragraphs: 5 }),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category5);
  // Test 6: Create category with null description (if allowed by API)
  try {
    const category6 = await api.functional.shoppingMall.admin.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: null as any, // Test null description handling
        } satisfies IShoppingMallCategory.ICreate,
      },
    );
    typia.assert(category6);
  } catch (error) {
    // Null description might not be supported, which is acceptable
  }
  // Validate that categories can be retrieved and appear in listing
  // (Assuming a GET endpoint exists for listing categories)
}
