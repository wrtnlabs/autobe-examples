import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate hierarchical metadata of category retrieval in a category tree.
 *
 * Business goal: Ensure that the public category detail endpoint correctly
 * exposes hierarchical metadata (`treeCode`, `code`, `parentCategoryCode`,
 * `depth`, `isLeaf`) that matches the tree and categories configured via
 * platform admin APIs.
 *
 * End-to-end flow:
 *
 * 1. Register a platform admin via POST /auth/platformAdmin/join to obtain
 *    authenticated admin context (authorization header is managed by SDK).
 * 2. As that admin, create an active category tree using POST
 *    /shoppingMall/platformAdmin/categoryTrees with
 *    IShoppingMallCategoryTree.ICreate, capturing its `code`.
 * 3. Create a root category in that tree via POST
 *    /shoppingMall/platformAdmin/categoryTrees/{categoryTreeCode}/categories
 *    with IShoppingMallCategory.ICreate where `parentCategoryCode` is omitted
 *    and `isActive` is true. Capture the resulting IShoppingMallCategory as
 *    `rootCategory`.
 * 4. Create a child category under that root by calling the same create endpoint,
 *    this time providing `parentCategoryCode: rootCategory.code` and `isActive:
 *    true`. Capture as `childCategory`.
 * 5. Simulate a guest client (no Authorization header) by cloning the connection
 *    but overriding headers with an empty object. Using this guest connection,
 *    call GET
 *    /shoppingMall/categoryTrees/{categoryTreeCode}/categories/{categoryCode}
 *    via api.functional.shoppingMall.categoryTrees.categories.at for the child
 *    category, using `tree.code` and `childCategory.code`.
 * 6. Assert via typia.assert that the response is a valid IShoppingMallCategory
 *    and then validate:
 *
 *    - Response.treeCode equals tree.code
 *    - Response.code equals childCategory.code
 *    - Response.parentCategoryCode equals rootCategory.code
 *    - Response.depth is strictly greater than rootCategory.depth
 *    - Response.isLeaf is true (since no further descendants were created)
 * 7. Optionally, fetch the root category through the same public endpoint and
 *    assert:
 *
 *    - Its treeCode equals tree.code
 *    - Its code equals rootCategory.code
 *    - Its parentCategoryCode is null (or undefined) to represent a root node
 *    - Its depth is strictly less than childCategory.depth
 *    - IsLeaf is false if the implementation flips it when a child exists, but only
 *         check this as a predicate consistent with whether
 *         `rootCategory.isLeaf` changed between create-time and read-time.
 *
 * Implementation-specific notes:
 *
 * - Use only the provided DTOs and API functions:
 *
 *   - Api.functional.auth.platformAdmin.join
 *   - Api.functional.shoppingMall.platformAdmin.categoryTrees.create
 *   - Api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create
 *   - Api.functional.shoppingMall.categoryTrees.categories.at
 * - Use typia.random<...>() and RandomGenerator utilities to generate concrete
 *   but valid values for required fields (email, URIs, codes, names, etc.).
 * - Never touch connection.headers directly in test code (even though the SDK
 *   implementation does so internally). To simulate a guest, create a new
 *   connection object with the same host and simulate/options, but with a fresh
 *   `headers: {}` value and do not mutate it afterward.
 * - Use TestValidator.equals and TestValidator.predicate with descriptive titles
 *   for business logic assertions. Do not check HTTP status codes explicitly;
 *   rely on successful call for 200-path.
 */
export async function test_api_category_retrieval_hierarchical_fields(
  connection: api.IConnection,
) {
  // 1. Register a platform admin so that subsequent platformAdmin endpoints
  //    can be called. The SDK will attach the Authorization header
  //    automatically using the returned token.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // For href and referrer, use valid URI-format strings.
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    // ip is optional; omit it to keep shape simple.
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new active category tree as this platform admin.
  const treeBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const tree: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: treeBody,
      },
    );
  typia.assert(tree);

  // 3. Create a root category with no parentCategoryCode and isActive = true.
  const rootCategoryBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 1 as number & tags.Type<"int32">,
    isActive: true,
    // parentCategoryCode intentionally omitted to create a root node.
  } satisfies IShoppingMallCategory.ICreate;

  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: rootCategoryBody,
      },
    );
  typia.assert(rootCategory);

  // 4. Create a child category under the root with isActive = true.
  const childCategoryBody = {
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    displayOrder: 2 as number & tags.Type<"int32">,
    isActive: true,
    parentCategoryCode: rootCategory.code,
  } satisfies IShoppingMallCategory.ICreate;

  const childCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.categories.create(
      connection,
      {
        categoryTreeCode: tree.code,
        body: childCategoryBody,
      },
    );
  typia.assert(childCategory);

  // 5. Simulate guest: clone connection but with fresh empty headers object.
  const guestConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Fetch child category via public endpoint as a guest.
  const childViaGuest: IShoppingMallCategory =
    await api.functional.shoppingMall.categoryTrees.categories.at(
      guestConnection,
      {
        categoryTreeCode: tree.code,
        categoryCode: childCategory.code,
      },
    );
  typia.assert(childViaGuest);

  // 6. Validate hierarchical metadata for child category.
  TestValidator.equals(
    "child treeCode matches tree.code",
    childViaGuest.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "child code matches created child code",
    childViaGuest.code,
    childCategory.code,
  );
  TestValidator.equals(
    "child parentCategoryCode equals root category code",
    childViaGuest.parentCategoryCode ?? null,
    rootCategory.code,
  );
  TestValidator.predicate(
    "child depth is greater than root depth",
    childViaGuest.depth > rootCategory.depth,
  );
  TestValidator.equals(
    "child isLeaf is true when only one level of descendants exists",
    childViaGuest.isLeaf,
    true,
  );

  // 7. Optionally, fetch the root category via the same public endpoint and
  //    assert that it behaves as a root in terms of hierarchy.
  const rootViaGuest: IShoppingMallCategory =
    await api.functional.shoppingMall.categoryTrees.categories.at(
      guestConnection,
      {
        categoryTreeCode: tree.code,
        categoryCode: rootCategory.code,
      },
    );
  typia.assert(rootViaGuest);

  TestValidator.equals(
    "root treeCode matches tree.code",
    rootViaGuest.treeCode,
    tree.code,
  );
  TestValidator.equals(
    "root code matches created root code",
    rootViaGuest.code,
    rootCategory.code,
  );

  // parentCategoryCode must be null or undefined for a root node.
  TestValidator.predicate(
    "root parentCategoryCode is null or undefined",
    rootViaGuest.parentCategoryCode === null ||
      rootViaGuest.parentCategoryCode === undefined,
  );

  TestValidator.predicate(
    "root depth is less than child depth",
    rootViaGuest.depth < childViaGuest.depth,
  );
}
