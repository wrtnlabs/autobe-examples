import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Verify that an authenticated admin can update basic editable fields of a
 * product tag while immutable fields remain stable.
 *
 * Steps:
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create an initial product tag via POST /shoppingMall/admin/productTags with
 *    explicit business values for code, label, description, and isActive.
 * 3. Update the tag via PUT /shoppingMall/admin/productTags/{productTagId} using
 *    IShoppingMallProductTag.IUpdate, changing label and description and
 *    toggling active status while leaving code undefined so it remains
 *    unchanged.
 * 4. Assert that the update response:
 *
 *    - Keeps id and created_at unchanged.
 *    - Updates updated_at to a later timestamp.
 *    - Reflects the new label in the `name` field (business mapping label -> name).
 *    - Reflects the new description, with deleted_at still null/undefined.
 *
 * Due to available SDK operations, we treat the update response as the
 * persisted state and do not perform a separate GET-by-id read-back.
 */
export async function test_api_admin_product_tag_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create initial product tag
  const initialLabel = RandomGenerator.paragraph({ sentences: 2 });
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });

  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    label: initialLabel,
    description: initialDescription,
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallProductTag>(createdTag);

  // 3. Update the product tag with new label/description and toggled isActive
  const updatedLabel = RandomGenerator.paragraph({ sentences: 2 });
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });

  const updateBody = {
    label: updatedLabel,
    description: updatedDescription,
    isActive: false,
  } satisfies IShoppingMallProductTag.IUpdate;

  const updatedTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.update(connection, {
      productTagId: createdTag.id,
      body: updateBody,
    });
  typia.assert<IShoppingMallProductTag>(updatedTag);

  // 4. Business rule validations
  TestValidator.equals(
    "product tag id remains unchanged after update",
    updatedTag.id,
    createdTag.id,
  );

  TestValidator.equals(
    "product tag created_at remains unchanged after update",
    updatedTag.created_at,
    createdTag.created_at,
  );

  // updated_at should be greater than or equal to original updated_at
  const originalUpdatedAtMs = new Date(createdTag.updated_at).getTime();
  const newUpdatedAtMs = new Date(updatedTag.updated_at).getTime();

  TestValidator.predicate(
    "product tag updated_at is not earlier than original updated_at",
    newUpdatedAtMs >= originalUpdatedAtMs,
  );

  // name should track the updated label (label -> name mapping)
  TestValidator.equals(
    "product tag name reflects updated label",
    updatedTag.name,
    updatedLabel,
  );

  // description should be updated to new description
  TestValidator.equals(
    "product tag description is updated",
    updatedTag.description ?? null,
    updatedDescription,
  );

  // deleted_at should remain null/undefined (tag is not soft-deleted by update)
  TestValidator.predicate(
    "product tag deleted_at remains null or undefined after update",
    updatedTag.deleted_at === null || updatedTag.deleted_at === undefined,
  );
}
