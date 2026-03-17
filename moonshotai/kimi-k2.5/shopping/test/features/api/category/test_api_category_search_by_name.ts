import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test searching categories by name using partial text matching.
 *
 * 1. Create admin account and authenticate
 * 2. Create multiple categories with distinct names
 * 3. Search using a substring that matches only specific categories
 * 4. Verify matching categories are returned in results
 * 5. Verify non-matching categories are excluded from results
 */
export async function test_api_category_search_by_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create categories with distinct names for search testing
  const matchingCategories: IEcommerceMallCategory[] = await Promise.all(
    ArrayUtil.repeat(3, () =>
      generate_random_ecommerce_mall_admin_categories_create(adminConnection, {
        body: {
          name: `Electronics ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallCategory.ICreate,
      }),
    ),
  );
  const nonMatchingCategories: IEcommerceMallCategory[] = await Promise.all(
    ArrayUtil.repeat(2, () =>
      generate_random_ecommerce_mall_admin_categories_create(adminConnection, {
        body: {
          name: `Clothing ${RandomGenerator.name(2)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallCategory.ICreate,
      }),
    ),
  );
  // 3. Search using "Electronics" substring which should match only electronics categories
  const searchResult: IPageIEcommerceMallCategory.ISummary =
    await api.functional.ecommerceMall.categories.index(adminConnection, {
      body: {
        search: "Electronics",
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(searchResult);
  // 4. Verify matching categories are returned
  TestValidator.predicate(
    "search returns matching electronics categories",
    () =>
      matchingCategories.every((cat) =>
        searchResult.data.some((result) => result.id === cat.id),
      ),
  );
  // 5. Verify non-matching clothing categories are excluded
  TestValidator.predicate(
    "search excludes non-matching clothing categories",
    () =>
      nonMatchingCategories.every(
        (cat) => !searchResult.data.some((result) => result.id === cat.id),
      ),
  );
  // 6. Verify all returned results actually contain the search term
  TestValidator.predicate("all returned categories contain search term", () =>
    searchResult.data.every((cat) =>
      cat.name.toLowerCase().includes("electronics"),
    ),
  );
  // 7. Verify pagination structure is correct
  TestValidator.equals(
    "pagination limit is correct",
    searchResult.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "current page is 1",
    () => searchResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "records count matches expected",
    () => searchResult.pagination.records >= 3,
  );
}
