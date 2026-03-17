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

export async function test_api_category_tree_excludes_deleted_categories(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create "Books" top-level category (surviving)
  const booksCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Books",
          description: "All book categories",
        },
      },
    );
  typia.assert(booksCategory);
  // 3. Create "Fiction" subcategory under "Books" (surviving)
  const fictionCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: booksCategory.id,
          name: "Fiction",
          description: "Fiction books",
        },
      },
    );
  typia.assert(fictionCategory);
  // 4. Create "Temporary" top-level category (will be deleted)
  const temporaryCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: null,
          name: "Temporary",
          description: "Temporary category to be deleted",
        },
      },
    );
  typia.assert(temporaryCategory);
  // 5. Create "Sub-Temporary" subcategory under "Temporary" (will be cascade-deleted)
  const subTemporaryCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          parent_id: temporaryCategory.id,
          name: "Sub-Temporary",
          description: "Sub category of temporary",
        },
      },
    );
  typia.assert(subTemporaryCategory);
  // 6. Delete "Temporary" top-level category — cascades to "Sub-Temporary"
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: temporaryCategory.id,
  });
  // 7. Retrieve category tree (public endpoint — no auth needed)
  const publicConnection: api.IConnection = { host: connection.host };
  const tree =
    await api.functional.shoppingMall.categories.tree(publicConnection);
  typia.assert(tree);
  // 8. Verify "Temporary" does NOT exist in tree top-level (tree.children = top-level categories)
  const temporaryInTree = tree.children.find((c) => c.name === "Temporary");
  TestValidator.predicate(
    "Temporary category should NOT exist in the tree",
    temporaryInTree === undefined,
  );
  // 9. Verify "Books" exists in tree
  const booksInTree = tree.children.find((c) => c.name === "Books");
  TestValidator.predicate(
    "Books category should exist in the tree",
    booksInTree !== undefined,
  );
  // 10. Verify "Sub-Temporary" does NOT appear anywhere in tree (cascade deleted)
  const allSubcategories = tree.children.flatMap((c) => c.children);
  const subTempAnywhere = allSubcategories.find(
    (c) => c.name === "Sub-Temporary",
  );
  TestValidator.predicate(
    "Sub-Temporary should NOT exist anywhere in the tree",
    subTempAnywhere === undefined,
  );
  // 11. Verify "Fiction" exists under "Books" and Books has exactly 1 child
  if (booksInTree !== undefined) {
    TestValidator.equals(
      "Books should have exactly 1 child",
      booksInTree.children.length,
      1,
    );
    const fictionInBooks = booksInTree.children.find(
      (c) => c.name === "Fiction",
    );
    TestValidator.predicate(
      "Fiction subcategory should exist under Books",
      fictionInBooks !== undefined,
    );
    // Fiction itself should have no children (leaf node in two-tier hierarchy)
    if (fictionInBooks !== undefined) {
      TestValidator.equals(
        "Fiction should have no children",
        fictionInBooks.children.length,
        0,
      );
    }
  }
}
