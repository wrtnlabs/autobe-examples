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

export async function test_api_seller_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const sellerConnection: api.IConnection = { host: connection.host };
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Register a seller account and authenticate
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Register an administrator account and authenticate
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Administrator creates test categories with overlapping name patterns
  const electronics =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: { name: "Electronics" },
      },
    );
  typia.assert(electronics);
  const electrodomesticos =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: { name: "Electrodomesticos" },
      },
    );
  typia.assert(electrodomesticos);
  const clothing =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: { name: "Clothing" },
      },
    );
  typia.assert(clothing);
  const books =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: { name: "Books" },
      },
    );
  typia.assert(books);
  // 4. Search with "Electro" - should match "Electronics" and "Electrodomesticos" (partial, case-insensitive)
  const searchResult =
    await api.functional.eCommerceMall.seller.categories.index(
      sellerConnection,
      {
        body: {
          search: "Electro",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "matching categories count",
    searchResult.data.length,
    2,
  );
  TestValidator.equals(
    "records match filtered count",
    searchResult.pagination.records,
    2,
  );
  TestValidator.predicate("contains Electronics", () =>
    searchResult.data.some((c) => c.name === "Electronics"),
  );
  TestValidator.predicate("contains Electrodomesticos", () =>
    searchResult.data.some((c) => c.name === "Electrodomesticos"),
  );
  TestValidator.predicate("excludes Clothing", () =>
    searchResult.data.every((c) => c.name !== "Clothing"),
  );
  TestValidator.predicate("excludes Books", () =>
    searchResult.data.every((c) => c.name !== "Books"),
  );
  // 5. Search with "XYZZZ" - a term that matches no categories
  const emptyResult =
    await api.functional.eCommerceMall.seller.categories.index(
      sellerConnection,
      {
        body: {
          search: "XYZZZ",
          page: 1,
          limit: 100,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals("empty result count", emptyResult.data.length, 0);
  TestValidator.equals("records is 0", emptyResult.pagination.records, 0);
  TestValidator.equals("pages is 0", emptyResult.pagination.pages, 0);
}
