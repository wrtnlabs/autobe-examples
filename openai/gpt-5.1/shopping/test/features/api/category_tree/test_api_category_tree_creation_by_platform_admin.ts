import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can create a new category tree
 * configuration.
 *
 * Business workflow:
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 * 2. Use the authenticated admin session to call POST
 *    /shoppingMall/platformAdmin/categoryTrees.
 * 3. Verify that the created category tree reflects the requested configuration
 *    and includes proper lifecycle timestamps.
 */
export async function test_api_category_tree_creation_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator (join)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new category tree as the authenticated platform admin
  const treeCodePrefix = "MAIN-CATALOG-";
  const treeCode = `${treeCodePrefix}${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: treeCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const createdTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallCategoryTree>(createdTree);

  // 3. Business-level validations
  TestValidator.equals(
    "category tree code should match request",
    createdTree.code,
    createBody.code,
  );
  TestValidator.equals(
    "category tree name should match request",
    createdTree.name,
    createBody.name,
  );
  TestValidator.equals(
    "category tree description should match request",
    createdTree.description,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "category tree active flag should match request (true)",
    createdTree.active,
    true,
  );
  TestValidator.equals(
    "category tree defaultLocale should match request",
    createdTree.defaultLocale,
    createBody.defaultLocale,
  );

  // id should be a non-empty string
  TestValidator.predicate(
    "category tree id should be a non-empty string",
    typeof createdTree.id === "string" && createdTree.id.length > 0,
  );

  // createdAt and updatedAt must be present and valid ISO date-time strings
  TestValidator.predicate(
    "category tree createdAt must be a non-empty ISO string",
    typeof createdTree.createdAt === "string" &&
      createdTree.createdAt.length > 0,
  );
  TestValidator.predicate(
    "category tree updatedAt must be a non-empty ISO string",
    typeof createdTree.updatedAt === "string" &&
      createdTree.updatedAt.length > 0,
  );

  // Ensure updatedAt is not earlier than createdAt
  const createdAtDate = new Date(createdTree.createdAt);
  const updatedAtDate = new Date(createdTree.updatedAt);
  TestValidator.predicate(
    "updatedAt should be greater than or equal to createdAt",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
}
