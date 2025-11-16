import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that an authenticated platform admin can retrieve a specific
 * category tree by its unique business code and see all key fields.
 *
 * Business flow:
 *
 * 1. Join as a new platform admin to obtain an authenticated connection.
 * 2. Create a category tree with a unique business code and metadata.
 * 3. Retrieve the category tree detail by its code via the GET endpoint.
 * 4. Verify that all key fields (code, name, description, defaultLocale, active)
 *    match those used/returned at creation time.
 * 5. Verify lifecycle timestamps are valid ISO-8601 strings and that createdAt is
 *    not later than updatedAt.
 */
export async function test_api_category_tree_detail_retrieval_by_code(
  connection: api.IConnection,
) {
  // 1. Join as a new platform admin
  const joinRequestBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(admin);

  // 2. Create a category tree with a unique code
  const uniqueSuffix: string = RandomGenerator.alphaNumeric(8);
  const createBody = {
    code: `main_catalog_en_${uniqueSuffix}`,
    name: `Main Catalog EN ${uniqueSuffix}`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const createdTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdTree);

  // Sanity check: id should be non-empty
  TestValidator.predicate(
    "created category tree id is non-empty",
    createdTree.id.length > 0,
  );

  // 3. Retrieve the category tree by its code
  const fetchedTree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.at(
      connection,
      {
        categoryTreeCode: createdTree.code,
      },
    );
  typia.assert(fetchedTree);

  // 4. Assert that key fields match between created and fetched
  TestValidator.equals(
    "category tree code matches between create and fetch",
    fetchedTree.code,
    createdTree.code,
  );
  TestValidator.equals(
    "category tree name matches between create and fetch",
    fetchedTree.name,
    createdTree.name,
  );
  TestValidator.equals(
    "category tree description matches between create and fetch",
    fetchedTree.description ?? null,
    createdTree.description ?? null,
  );
  TestValidator.equals(
    "category tree defaultLocale matches between create and fetch",
    fetchedTree.defaultLocale,
    createdTree.defaultLocale,
  );
  TestValidator.equals(
    "category tree active flag matches between create and fetch",
    fetchedTree.active,
    createdTree.active,
  );

  // 5. Timestamp validations: createdAt and updatedAt should be ISO date-time
  // typia.assert already ensures the format, so we just add business rule
  // that createdAt is not later than updatedAt.
  const createdAtMs: number = Date.parse(fetchedTree.createdAt);
  const updatedAtMs: number = Date.parse(fetchedTree.updatedAt);

  TestValidator.predicate(
    "createdAt parses to a valid timestamp",
    Number.isFinite(createdAtMs),
  );
  TestValidator.predicate(
    "updatedAt parses to a valid timestamp",
    Number.isFinite(updatedAtMs),
  );
  TestValidator.predicate(
    "createdAt is not later than updatedAt",
    createdAtMs <= updatedAtMs,
  );
}
