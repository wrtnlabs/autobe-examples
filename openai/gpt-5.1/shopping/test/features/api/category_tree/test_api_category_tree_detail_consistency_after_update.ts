import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that category tree detail reflects latest update state for platform
 * admin.
 *
 * Business flow:
 *
 * 1. Register a platform admin via auth.platformAdmin.join to obtain an authorized
 *    admin context.
 * 2. Create a category tree with a unique code and initial metadata using
 *    shoppingMall.platformAdmin.categoryTrees.create.
 * 3. Update the same tree via shoppingMall.platformAdmin.categoryTrees.update
 *    identified by categoryTreeCode (tree.code).
 * 4. Fetch the tree detail via shoppingMall.platformAdmin.categoryTrees.at with
 *    the same categoryTreeCode.
 * 5. Verify identifiers are stable and mutable fields reflect the update, and
 *    timestamp semantics (createdAt stable, updatedAt advanced).
 * 6. Optionally create another tree to confirm isolation of other records.
 */
export async function test_api_category_tree_detail_consistency_after_update(
  connection: api.IConnection,
) {
  // 1. Join platform admin to establish authorized context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create initial category tree
  const categoryTreeCode = `tree_${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: categoryTreeCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    active: true,
    defaultLocale: "en-US",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const created: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic invariants right after creation
  TestValidator.equals(
    "created tree code should match request code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created tree name should match request name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created tree description should match request description",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "created tree active flag should match request active",
    created.active,
    createBody.active,
  );
  TestValidator.equals(
    "created tree defaultLocale should match request defaultLocale",
    created.defaultLocale,
    createBody.defaultLocale,
  );

  // 3. Update the category tree with new metadata
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    active: false,
    defaultLocale: "ko-KR",
  } satisfies IShoppingMallCategoryTree.IUpdate;

  const updated: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.update(
      connection,
      {
        categoryTreeCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Verify identifiers and mutable field changes on update response
  TestValidator.equals(
    "updated tree id should stay same as created",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated tree code should stay same as created",
    updated.code,
    created.code,
  );

  TestValidator.equals(
    "updated tree name should match update request",
    updated.name,
    updateBody.name,
  );
  TestValidator.equals(
    "updated tree description should match update request",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "updated tree active flag should match update request",
    updated.active,
    updateBody.active,
  );
  TestValidator.equals(
    "updated tree defaultLocale should match update request",
    updated.defaultLocale,
    updateBody.defaultLocale,
  );

  TestValidator.equals(
    "createdAt should remain unchanged after update",
    updated.createdAt,
    created.createdAt,
  );
  TestValidator.notEquals(
    "updatedAt should change after update",
    updated.updatedAt,
    created.updatedAt,
  );

  // 5. Fetch detail via GET and verify consistency
  const fetched: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.at(
      connection,
      { categoryTreeCode },
    );
  typia.assert(fetched);

  TestValidator.equals(
    "fetched tree id should equal created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched tree code should equal created code",
    fetched.code,
    created.code,
  );

  TestValidator.equals(
    "fetched tree name should equal updated name",
    fetched.name,
    updateBody.name,
  );
  TestValidator.equals(
    "fetched tree description should equal updated description",
    fetched.description,
    updateBody.description,
  );
  TestValidator.equals(
    "fetched tree active flag should equal updated active",
    fetched.active,
    updateBody.active,
  );
  TestValidator.equals(
    "fetched tree defaultLocale should equal updated defaultLocale",
    fetched.defaultLocale,
    updateBody.defaultLocale,
  );

  TestValidator.equals(
    "fetched createdAt should equal original created createdAt",
    fetched.createdAt,
    created.createdAt,
  );

  TestValidator.predicate(
    "fetched updatedAt should be >= updated.updatedAt",
    () =>
      new Date(fetched.updatedAt).getTime() >=
      new Date(updated.updatedAt).getTime(),
  );

  // 6. Optional: create another independent tree to ensure isolation
  const secondCode = `tree_${RandomGenerator.alphaNumeric(8)}`;
  const secondCreateBody = {
    code: secondCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: true,
    defaultLocale: "en-GB",
  } satisfies IShoppingMallCategoryTree.ICreate;

  const second: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: secondCreateBody },
    );
  typia.assert(second);

  TestValidator.notEquals(
    "second tree id should differ from first tree id",
    second.id,
    created.id,
  );
  TestValidator.notEquals(
    "second tree code should differ from first tree code",
    second.code,
    created.code,
  );

  const refetchedFirst: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.at(
      connection,
      { categoryTreeCode },
    );
  typia.assert(refetchedFirst);

  TestValidator.equals(
    "refetched first tree id remains unchanged",
    refetchedFirst.id,
    created.id,
  );
  TestValidator.equals(
    "refetched first tree code remains unchanged",
    refetchedFirst.code,
    created.code,
  );
}
