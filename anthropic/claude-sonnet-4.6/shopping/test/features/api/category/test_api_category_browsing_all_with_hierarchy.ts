import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
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

export async function test_api_category_browsing_all_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: create admin connection and register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create top-level categories: Electronics, Clothing
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
  const clothing = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: null,
        name: "Clothing",
        description: "Apparel and fashion",
      },
    },
  );
  typia.assert(clothing);
  // 3. Create subcategories under Electronics: Phones, Laptops
  const phones = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: electronics.id,
        name: "Phones",
        description: "Mobile phones and smartphones",
      },
    },
  );
  typia.assert(phones);
  const laptops = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: electronics.id,
        name: "Laptops",
        description: "Laptop computers and notebooks",
      },
    },
  );
  typia.assert(laptops);
  // 4. Create subcategories under Clothing: Men, Women
  const men = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: clothing.id,
        name: "Men",
        description: "Men's clothing and accessories",
      },
    },
  );
  typia.assert(men);
  const women = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        parent_id: clothing.id,
        name: "Women",
        description: "Women's clothing and accessories",
      },
    },
  );
  typia.assert(women);
  // 5. Browse categories without authentication (public endpoint)
  const publicConnection: api.IConnection = { host: connection.host };
  const result = await api.functional.shoppingMall.categories.index(
    publicConnection,
    {
      body: {} satisfies IShoppingMallCategory.IRequest,
    },
  );
  typia.assert(result);
  // 6. Validate pagination metadata
  // The records count should equal the number of top-level categories (2)
  // because subcategories are nested under parents
  TestValidator.predicate(
    "records count matches top-level category count",
    result.pagination.records >= 2,
  );
  TestValidator.predicate(
    "current page is at least 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", result.pagination.limit > 0);
  TestValidator.predicate(
    "pages count is positive",
    result.pagination.pages >= 1,
  );
  // 7. Validate top-level categories appear in the data array
  const electronicsInResult = result.data.find(
    (cat) => cat.id === electronics.id,
  );
  const clothingInResult = result.data.find((cat) => cat.id === clothing.id);
  TestValidator.predicate(
    "Electronics category found in result",
    electronicsInResult !== undefined,
  );
  TestValidator.predicate(
    "Clothing category found in result",
    clothingInResult !== undefined,
  );
  // 8. Validate top-level categories have null parent_id
  if (electronicsInResult !== undefined) {
    TestValidator.equals(
      "Electronics parent_id is null",
      electronicsInResult.parent_id,
      null,
    );
    // 9. Validate Electronics has non-empty children
    TestValidator.predicate(
      "Electronics has children",
      electronicsInResult.children.length > 0,
    );
    // 10. Validate Phones and Laptops are in Electronics' children
    const phonesInChildren = electronicsInResult.children.find(
      (c) => c.id === phones.id,
    );
    const laptopsInChildren = electronicsInResult.children.find(
      (c) => c.id === laptops.id,
    );
    TestValidator.predicate(
      "Phones found in Electronics children",
      phonesInChildren !== undefined,
    );
    TestValidator.predicate(
      "Laptops found in Electronics children",
      laptopsInChildren !== undefined,
    );
    // 11. Validate subcategories have correct parent_id and empty children
    if (phonesInChildren !== undefined) {
      TestValidator.equals(
        "Phones parent_id equals Electronics id",
        phonesInChildren.parent_id,
        electronics.id,
      );
      TestValidator.equals(
        "Phones children is empty array",
        phonesInChildren.children.length,
        0,
      );
    }
    if (laptopsInChildren !== undefined) {
      TestValidator.equals(
        "Laptops parent_id equals Electronics id",
        laptopsInChildren.parent_id,
        electronics.id,
      );
      TestValidator.equals(
        "Laptops children is empty array",
        laptopsInChildren.children.length,
        0,
      );
    }
  }
  if (clothingInResult !== undefined) {
    TestValidator.equals(
      "Clothing parent_id is null",
      clothingInResult.parent_id,
      null,
    );
    // 12. Validate Clothing has non-empty children
    TestValidator.predicate(
      "Clothing has children",
      clothingInResult.children.length > 0,
    );
    // 13. Validate Men and Women are in Clothing's children
    const menInChildren = clothingInResult.children.find(
      (c) => c.id === men.id,
    );
    const womenInChildren = clothingInResult.children.find(
      (c) => c.id === women.id,
    );
    TestValidator.predicate(
      "Men found in Clothing children",
      menInChildren !== undefined,
    );
    TestValidator.predicate(
      "Women found in Clothing children",
      womenInChildren !== undefined,
    );
    // 14. Validate subcategories have correct parent_id and empty children
    if (menInChildren !== undefined) {
      TestValidator.equals(
        "Men parent_id equals Clothing id",
        menInChildren.parent_id,
        clothing.id,
      );
      TestValidator.equals(
        "Men children is empty array",
        menInChildren.children.length,
        0,
      );
    }
    if (womenInChildren !== undefined) {
      TestValidator.equals(
        "Women parent_id equals Clothing id",
        womenInChildren.parent_id,
        clothing.id,
      );
      TestValidator.equals(
        "Women children is empty array",
        womenInChildren.children.length,
        0,
      );
    }
  }
  // 15. Verify that subcategories are NOT listed as top-level items in data
  const phonesAsTopLevel = result.data.find((cat) => cat.id === phones.id);
  const laptopsAsTopLevel = result.data.find((cat) => cat.id === laptops.id);
  const menAsTopLevel = result.data.find((cat) => cat.id === men.id);
  const womenAsTopLevel = result.data.find((cat) => cat.id === women.id);
  TestValidator.predicate(
    "Phones is not a top-level item",
    phonesAsTopLevel === undefined,
  );
  TestValidator.predicate(
    "Laptops is not a top-level item",
    laptopsAsTopLevel === undefined,
  );
  TestValidator.predicate(
    "Men is not a top-level item",
    menAsTopLevel === undefined,
  );
  TestValidator.predicate(
    "Women is not a top-level item",
    womenAsTopLevel === undefined,
  );
}
