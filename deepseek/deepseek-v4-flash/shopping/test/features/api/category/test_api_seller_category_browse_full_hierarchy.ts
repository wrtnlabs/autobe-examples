import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

export async function test_api_seller_category_browse_full_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Register administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 3. Create top-level category
  const topCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        },
      },
    );
  typia.assert(topCategory);
  // 4. Create subcategory under the top-level category
  const subCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: topCategory.id,
        },
      },
    );
  typia.assert(subCategory);
  // 5. Browse the full category hierarchy as seller
  const page = await api.functional.eCommerceMall.seller.categories.index(
    sellerConnection,
    {
      body: {} satisfies IECommerceMallCategory.IRequest,
    },
  );
  typia.assert(page);
  // 6. Validate pagination metadata
  TestValidator.equals("pagination current page", page.pagination.current, 1);
  TestValidator.equals("pagination records count", page.pagination.records, 2);
  TestValidator.equals("pagination total pages", page.pagination.pages, 1);
  // 7. Find the top-level category in the response
  const foundTop = page.data.find((c) => c.id === topCategory.id);
  TestValidator.predicate("top-level category exists", foundTop !== undefined);
  typia.assertGuard(foundTop!);
  TestValidator.equals("top-level name", foundTop.name, "Electronics");
  TestValidator.equals(
    "top-level description",
    foundTop.description,
    "Electronic devices and accessories",
  );
  TestValidator.predicate(
    "top-level has created_at",
    typeof foundTop.created_at === "string",
  );
  TestValidator.predicate(
    "top-level has updated_at",
    typeof foundTop.updated_at === "string",
  );
  TestValidator.predicate(
    "top-level deleted_at is null",
    foundTop.deleted_at === null,
  );
  TestValidator.predicate("top-level parent is null", foundTop.parent === null);
  TestValidator.predicate(
    "top-level has products_count",
    foundTop.products_count !== undefined,
  );
  TestValidator.equals(
    "top-level products_count is 0",
    foundTop.products_count,
    0,
  );
  // 8. Validate subcategories on top-level category
  TestValidator.predicate(
    "top-level has subcategories",
    foundTop.subcategories.length > 0,
  );
  const foundSubInTop = foundTop.subcategories.find(
    (s) => s.id === subCategory.id,
  );
  TestValidator.predicate(
    "subcategory found in top-level's subcategories",
    foundSubInTop !== undefined,
  );
  typia.assertGuard(foundSubInTop!);
  TestValidator.equals(
    "subcategory name matches",
    foundSubInTop.name,
    "Smartphones",
  );
  // 9. Find the subcategory in the data array (should also appear as standalone)
  const foundSub = page.data.find((c) => c.id === subCategory.id);
  typia.assertGuard(foundSub!);
  TestValidator.predicate(
    "subcategory parent is not null",
    foundSub.parent !== null,
  );
  TestValidator.equals(
    "subcategory parent id matches top-level",
    foundSub.parent!.id,
    topCategory.id,
  );
  TestValidator.equals(
    "subcategory parent name matches top-level",
    foundSub.parent!.name,
    "Electronics",
  );
}
