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

export async function test_api_seller_category_filter_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Register administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 3. Create categories using admin
  // 3.1. Top-level category: Electronics
  const electronics =
    await api.functional.eCommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and accessories",
        } satisfies IECommerceMallCategory.ICreate,
      },
    );
  typia.assert(electronics);
  // 3.2. Subcategory: Smartphones under Electronics
  const smartphones =
    await api.functional.eCommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and smartphones",
          parent_id: electronics.id,
        } satisfies IECommerceMallCategory.ICreate,
      },
    );
  typia.assert(smartphones);
  // 3.3. Subcategory: Laptops under Electronics
  const laptops =
    await api.functional.eCommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Laptops",
          description: "Laptop computers and notebooks",
          parent_id: electronics.id,
        } satisfies IECommerceMallCategory.ICreate,
      },
    );
  typia.assert(laptops);
  // 4. Test as seller: filter by parent_id=null (top-level only)
  const topLevelPage =
    await api.functional.eCommerceMall.seller.categories.index(
      sellerConnection,
      {
        body: {
          parent_id: null,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(topLevelPage);
  TestValidator.equals(
    "top-level categories count",
    topLevelPage.data.length,
    1,
  );
  TestValidator.equals(
    "top-level category name",
    topLevelPage.data[0].name,
    "Electronics",
  );
  TestValidator.predicate(
    "electronics has subcategories",
    topLevelPage.data[0].subcategories.length >= 2,
  );
  // 5. Test: filter by parent_id=electronics.id (subcategories only)
  const subcategoriesPage =
    await api.functional.eCommerceMall.seller.categories.index(
      sellerConnection,
      {
        body: {
          parent_id: electronics.id,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(subcategoriesPage);
  TestValidator.equals("subcategories count", subcategoriesPage.data.length, 2);
  for (const sub of subcategoriesPage.data) {
    TestValidator.predicate("subcategory has parent", sub.parent !== null);
    TestValidator.equals(
      "parent id matches electronics",
      sub.parent!.id,
      electronics.id,
    );
  }
  // 6. Test: filter by non-existent UUID (empty results)
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  const emptyPage = await api.functional.eCommerceMall.seller.categories.index(
    sellerConnection,
    {
      body: {
        parent_id: nonExistentId,
      } satisfies IECommerceMallCategory.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page data length", emptyPage.data.length, 0);
}
