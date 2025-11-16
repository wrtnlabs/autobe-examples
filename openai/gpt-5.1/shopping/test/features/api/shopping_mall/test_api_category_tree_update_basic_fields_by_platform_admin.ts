import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_category_tree_update_basic_fields_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an initial category tree with explicit active and defaultLocale
  const initialCode = `UPDATABLE-TREE-${RandomGenerator.alphaNumeric(8)}`;
  const initialName = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 4 });
  const initialActive = true;
  const initialDefaultLocale = "en-US";

  const createBody = {
    code: initialCode,
    name: initialName,
    description: initialDescription,
    active: initialActive,
    defaultLocale: initialDefaultLocale,
  } satisfies IShoppingMallCategoryTree.ICreate;

  const created: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Sanity assertions on created entity
  TestValidator.equals(
    "created tree code must match request",
    created.code,
    initialCode,
  );
  TestValidator.equals(
    "created tree name must match request",
    created.name,
    initialName,
  );
  TestValidator.equals(
    "created tree description must match request",
    created.description,
    initialDescription,
  );
  TestValidator.equals(
    "created tree defaultLocale must match request",
    created.defaultLocale,
    initialDefaultLocale,
  );
  TestValidator.equals(
    "created tree active must match request",
    created.active,
    initialActive,
  );

  const originalId = created.id;
  const originalCode = created.code;
  const originalActive = created.active;
  const originalCreatedAt = created.createdAt;
  const originalUpdatedAt = created.updatedAt;

  // 3. Build update payload changing name/description/defaultLocale, leaving active undefined
  const updatedName = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDefaultLocale = "ko-KR";

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    defaultLocale: updatedDefaultLocale,
    // active intentionally omitted to ensure it remains unchanged
  } satisfies IShoppingMallCategoryTree.IUpdate;

  const updated: IShoppingMallCategoryTree =
    await api.functional.shoppingMall.platformAdmin.categoryTrees.update(
      connection,
      {
        categoryTreeCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 4. Validate that immutable fields remain the same
  TestValidator.equals(
    "updated tree id must remain identical",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "updated tree code must remain identical",
    updated.code,
    originalCode,
  );

  // 5. Validate that mutable fields were updated correctly
  TestValidator.equals(
    "updated tree name must match update payload",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "updated tree description must match update payload",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "updated tree defaultLocale must match update payload",
    updated.defaultLocale,
    updatedDefaultLocale,
  );

  // 6. Validate that active remains unchanged because it was not sent
  TestValidator.equals(
    "updated tree active must remain unchanged when not included in update payload",
    updated.active,
    originalActive,
  );

  // 7. Validate updatedAt reflects the update and is not earlier than createdAt/originalUpdatedAt
  await TestValidator.predicate(
    "updatedAt must be different after update",
    () => Promise.resolve(updated.updatedAt !== originalUpdatedAt),
  );

  const createdAtDate = new Date(originalCreatedAt);
  const originalUpdatedAtDate = new Date(originalUpdatedAt);
  const updatedAtDate = new Date(updated.updatedAt);

  await TestValidator.predicate(
    "updatedAt must be >= createdAt",
    async () => updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
  await TestValidator.predicate(
    "updatedAt must be >= previous updatedAt",
    async () => updatedAtDate.getTime() >= originalUpdatedAtDate.getTime(),
  );
}
