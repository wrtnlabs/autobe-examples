import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that a platform admin can toggle the `active` flag of a category tree
 * without changing other properties, using the update endpoint identified by
 * the tree's business code.
 *
 * Scenario:
 *
 * 1. Register (join) a platform admin to obtain an authorized session.
 * 2. Create a category tree with `active = false` using a unique `code`.
 * 3. Update the same tree via its `code` with an
 *    `IShoppingMallCategoryTree.IUpdate` payload that only sets `active =
 *    true`.
 * 4. Verify that only the `active` field has changed in the returned
 *    `IShoppingMallCategoryTree`, and that identity and other fields remain
 *    stable.
 * 5. Perform a second update to set `active = false` again and verify that the
 *    toggle works in both directions.
 */
export async function test_api_category_tree_activation_toggle(
  connection: api.IConnection,
) {
  // 1. Register (join) a new platform admin to acquire an authorized session.
  const joinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // simple but valid URIs
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a category tree with `active = false`.
  const treeCode: string = `TREE-${RandomGenerator.alphaNumeric(8)}`;
  const treeName: string = RandomGenerator.paragraph({ sentences: 2 });
  const defaultLocale: string = "en-US";

  const createBody = {
    code: treeCode,
    name: treeName,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    active: false,
    defaultLocale,
  } satisfies IShoppingMallCategoryTree.ICreate;

  const created: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      { body: createBody },
    );
  typia.assert(created);

  // Basic field equality checks after creation
  TestValidator.equals(
    "created tree code matches input",
    created.code,
    treeCode,
  );
  TestValidator.equals(
    "created tree name matches input",
    created.name,
    treeName,
  );
  TestValidator.equals(
    "created tree defaultLocale matches input",
    created.defaultLocale,
    defaultLocale,
  );
  TestValidator.equals(
    "created tree is initially inactive",
    created.active,
    false,
  );

  const originalId: string = created.id;
  const originalCreatedAt: string = created.createdAt;
  const originalUpdatedAt: string = created.updatedAt;
  const originalDescription: string | null | undefined = created.description;

  // 3. Update the tree to set `active = true` using its business code.
  const firstUpdateBody = {
    active: true,
  } satisfies IShoppingMallCategoryTree.IUpdate;

  const activated: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.update(
      connection,
      {
        categoryTreeCode: treeCode,
        body: firstUpdateBody,
      },
    );
  typia.assert(activated);

  // 4. Validate that only `active` changed and core identity fields remain.
  TestValidator.equals(
    "activated tree keeps same id",
    activated.id,
    originalId,
  );
  TestValidator.equals(
    "activated tree keeps same code",
    activated.code,
    treeCode,
  );
  TestValidator.equals(
    "activated tree keeps same name",
    activated.name,
    treeName,
  );
  TestValidator.equals(
    "activated tree keeps same defaultLocale",
    activated.defaultLocale,
    defaultLocale,
  );
  TestValidator.equals(
    "activated tree keeps same description",
    activated.description,
    originalDescription,
  );
  TestValidator.equals(
    "activated tree createdAt is unchanged",
    activated.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "activated tree updatedAt is refreshed",
    activated.updatedAt,
    originalUpdatedAt,
  );
  TestValidator.equals(
    "activated tree has active=true",
    activated.active,
    true,
  );

  const activatedUpdatedAt: string = activated.updatedAt;

  // 5. Toggle back to inactive: `active = false` again.
  const secondUpdateBody = {
    active: false,
  } satisfies IShoppingMallCategoryTree.IUpdate;

  const deactivated: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.update(
      connection,
      {
        categoryTreeCode: treeCode,
        body: secondUpdateBody,
      },
    );
  typia.assert(deactivated);

  TestValidator.equals(
    "deactivated tree keeps same id",
    deactivated.id,
    originalId,
  );
  TestValidator.equals(
    "deactivated tree keeps same code",
    deactivated.code,
    treeCode,
  );
  TestValidator.equals(
    "deactivated tree keeps same name",
    deactivated.name,
    treeName,
  );
  TestValidator.equals(
    "deactivated tree keeps same defaultLocale",
    deactivated.defaultLocale,
    defaultLocale,
  );
  TestValidator.equals(
    "deactivated tree keeps same description",
    deactivated.description,
    originalDescription,
  );
  TestValidator.equals(
    "deactivated tree createdAt remains original",
    deactivated.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "deactivated tree updatedAt changed again",
    deactivated.updatedAt,
    activatedUpdatedAt,
  );
  TestValidator.equals(
    "deactivated tree has active=false",
    deactivated.active,
    false,
  );
}
