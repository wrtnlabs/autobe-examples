import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfCustomer";
import type { IShoppingMallAdminOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminOfSeller";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function test_api_category_tree_with_full_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level category: Electronics
  const electronics =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(electronics);
  // 3. Create top-level category: Clothing
  const clothing = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: null,
        name: "Clothing",
        description: "Apparel and fashion items",
      },
    },
  );
  typia.assert(clothing);
  // 4. Create subcategory: Smartphones under Electronics
  const smartphones =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: electronics.id,
          name: "Smartphones",
          description: "Mobile phones and smartphones",
        },
      },
    );
  typia.assert(smartphones);
  // 5. Create subcategory: Laptops under Electronics
  const laptops = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: electronics.id,
        name: "Laptops",
        description: "Portable computers and laptops",
      },
    },
  );
  typia.assert(laptops);
  // 6. Create subcategory: Jackets under Clothing
  const jackets = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: clothing.id,
        name: "Jackets",
        description: "Jackets and outerwear",
      },
    },
  );
  typia.assert(jackets);
  // 7. Call the public category tree endpoint (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const treeResponse =
    await api.functional.shoppingMall.categories.tree(publicConnection);
  // The endpoint returns an array of top-level IShoppingMallCategory objects
  // SDK type is IShoppingMallCategory (singular) but runtime returns array per spec
  const tree = typia.assert<IShoppingMallCategory[]>(
    treeResponse as unknown as IShoppingMallCategory[],
  );
  // 8. Validate that both top-level categories are present
  const electronicsEntry = tree.find((cat) => cat.id === electronics.id);
  const clothingEntry = tree.find((cat) => cat.id === clothing.id);
  TestValidator.predicate(
    "Electronics category exists in tree",
    electronicsEntry !== undefined,
  );
  TestValidator.predicate(
    "Clothing category exists in tree",
    clothingEntry !== undefined,
  );
  // 9. Validate top-level categories have null parent_id
  TestValidator.equals(
    "Electronics parent_id is null",
    electronicsEntry!.parent_id,
    null,
  );
  TestValidator.equals(
    "Clothing parent_id is null",
    clothingEntry!.parent_id,
    null,
  );
  // 10. Validate Electronics has exactly 2 children (Smartphones and Laptops)
  TestValidator.equals(
    "Electronics has 2 children",
    electronicsEntry!.children.length,
    2,
  );
  const smartphonesChild = electronicsEntry!.children.find(
    (c) => c.id === smartphones.id,
  );
  const laptopsChild = electronicsEntry!.children.find(
    (c) => c.id === laptops.id,
  );
  TestValidator.predicate(
    "Smartphones child exists in Electronics",
    smartphonesChild !== undefined,
  );
  TestValidator.predicate(
    "Laptops child exists in Electronics",
    laptopsChild !== undefined,
  );
  // 11. Validate subcategory parent_id references
  TestValidator.equals(
    "Smartphones parent_id matches Electronics id",
    smartphonesChild!.parent_id,
    electronics.id,
  );
  TestValidator.equals(
    "Laptops parent_id matches Electronics id",
    laptopsChild!.parent_id,
    electronics.id,
  );
  // 12. Validate subcategories have empty children (two-tier hierarchy)
  TestValidator.equals(
    "Smartphones has no children",
    smartphonesChild!.children.length,
    0,
  );
  TestValidator.equals(
    "Laptops has no children",
    laptopsChild!.children.length,
    0,
  );
  // 13. Validate Clothing has exactly 1 child (Jackets)
  TestValidator.equals(
    "Clothing has 1 child",
    clothingEntry!.children.length,
    1,
  );
  const jacketsChild = clothingEntry!.children.find((c) => c.id === jackets.id);
  TestValidator.predicate(
    "Jackets child exists in Clothing",
    jacketsChild !== undefined,
  );
  TestValidator.equals(
    "Jackets parent_id matches Clothing id",
    jacketsChild!.parent_id,
    clothing.id,
  );
  TestValidator.equals(
    "Jackets has no children",
    jacketsChild!.children.length,
    0,
  );
}
