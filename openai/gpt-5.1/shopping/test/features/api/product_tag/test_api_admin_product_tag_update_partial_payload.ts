import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Validate partial update semantics of admin product tag update.
 *
 * Business objective:
 *
 * - Ensure that PUT /shoppingMall/admin/productTags/{productTagId} with
 *   IShoppingMallProductTag.IUpdate behaves as a partial update: only
 *   explicitly provided fields are modified and omitted fields are preserved.
 *
 * Steps:
 *
 * 1. Register an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context (SDK sets Authorization header automatically).
 * 2. Create a product tag via POST /shoppingMall/admin/productTags with a full
 *    IShoppingMallProductTag.ICreate payload (code, label, description,
 *    isActive=true).
 * 3. Perform a partial update via PUT /shoppingMall/admin/productTags/{id} sending
 *    an IShoppingMallProductTag.IUpdate body containing only description.
 * 4. Validate that description and updated_at changed, while name (label), slug,
 *    created_at, and deleted_at remain unchanged, proving partial update
 *    semantics.
 */
export async function test_api_admin_product_tag_update_partial_payload(
  connection: api.IConnection,
) {
  // 1. Admin registration to establish authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an initial product tag with full payload
  const initialCode: string = RandomGenerator.alphaNumeric(12);
  const initialLabel: string = RandomGenerator.paragraph({
    sentences: 2,
  });
  const initialDescription: string = RandomGenerator.paragraph({
    sentences: 3,
  });

  const createBody = {
    code: initialCode,
    label: initialLabel,
    description: initialDescription,
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallProductTag>(createdTag);

  // Capture original fields for comparison
  const originalId = createdTag.id;
  const originalName = createdTag.name;
  const originalSlug = createdTag.slug;
  const originalDescription = createdTag.description;
  const originalCreatedAt = createdTag.created_at;
  const originalUpdatedAt = createdTag.updated_at;
  const originalDeletedAt = createdTag.deleted_at;

  // Basic sanity checks on created tag
  TestValidator.equals(
    "created tag id should remain stable for updates",
    createdTag.id,
    originalId,
  );
  TestValidator.equals(
    "created tag name should reflect initial label semantics",
    createdTag.name,
    originalName,
  );

  // 3. Partial update: only change description
  const updatedDescription: string = RandomGenerator.paragraph({
    sentences: 4,
  });

  const updateBody = {
    description: updatedDescription,
  } satisfies IShoppingMallProductTag.IUpdate;

  const updatedTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.update(connection, {
      productTagId: originalId,
      body: updateBody,
    });
  typia.assert<IShoppingMallProductTag>(updatedTag);

  // 4. Validate partial update semantics

  // 4-1. Description has been updated
  TestValidator.equals(
    "description should be updated after partial update",
    updatedTag.description,
    updatedDescription,
  );

  // 4-2. Name (label equivalent) must remain unchanged
  TestValidator.equals(
    "name should remain unchanged when not included in update payload",
    updatedTag.name,
    originalName,
  );

  // 4-3. Slug must remain unchanged
  TestValidator.equals(
    "slug should remain unchanged when not included in update payload",
    updatedTag.slug,
    originalSlug,
  );

  // 4-4. created_at must remain unchanged
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedTag.created_at,
    originalCreatedAt,
  );

  // 4-5. deleted_at must remain unchanged
  TestValidator.equals(
    "deleted_at should remain unchanged after update",
    updatedTag.deleted_at,
    originalDeletedAt,
  );

  // 4-6. updated_at must change to reflect modification
  TestValidator.notEquals(
    "updated_at should change after partial update",
    updatedTag.updated_at,
    originalUpdatedAt,
  );
}
