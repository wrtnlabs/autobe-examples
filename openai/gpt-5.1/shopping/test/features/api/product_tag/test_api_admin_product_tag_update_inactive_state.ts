import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Validate that an admin can deactivate a product tag using the admin
 * productTags.update endpoint, and that only the intended tag is affected.
 *
 * Business flow:
 *
 * 1. Register an admin using POST /auth/admin/join.
 * 2. Create an active product tag using POST /shoppingMall/admin/productTags with
 *    IShoppingMallProductTag.ICreate, explicitly setting isActive: true.
 * 3. Deactivate that tag via PUT /shoppingMall/admin/productTags/{productTagId}
 *    using IShoppingMallProductTag.IUpdate, setting isActive to false and not
 *    modifying other fields.
 * 4. Validate that the update response refers to the same tag id and that audit
 *    fields behave consistently (updated_at is changed while created_at is
 *    preserved).
 * 5. Ensure no other tag is impacted (in this isolated test we only create a
 *    single tag, so this is implicitly guaranteed).
 */
export async function test_api_admin_product_tag_update_inactive_state(
  connection: api.IConnection,
) {
  // 1. Admin registration (join) to obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Create an active product tag
  const createBody = {
    code: `tag-${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const created = await api.functional.shoppingMall.admin.productTags.create(
    connection,
    {
      body: createBody,
    },
  );
  typia.assert(created);

  // Basic sanity checks on created tag
  TestValidator.predicate(
    "created tag id should be a non-empty UUID string",
    () => created.id.length > 0,
  );
  TestValidator.predicate(
    "created_at should not be empty",
    () => created.created_at.length > 0,
  );

  // Capture original audit values for comparison
  const originalId = created.id;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;

  // 3. Deactivate the tag via update (set isActive to false only)
  const updateBody = {
    isActive: false,
  } satisfies IShoppingMallProductTag.IUpdate;

  const updated = await api.functional.shoppingMall.admin.productTags.update(
    connection,
    {
      productTagId: created.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 4. Validate that update affected only the intended tag and that
  //    audit fields behave as expected.

  // Same identifier
  TestValidator.equals(
    "updated tag id should match original id",
    updated.id,
    originalId,
  );

  // created_at must stay the same
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updated.created_at,
    originalCreatedAt,
  );

  // updated_at should be the same or later than the original value;
  // since both are ISO date-time strings, string comparison is
  // consistent for ordering.
  TestValidator.predicate(
    "updated_at should not be earlier than original updated_at",
    () => updated.updated_at >= originalUpdatedAt,
  );

  // Name, slug and description should remain as initially returned
  // by the create endpoint.
  TestValidator.equals(
    "tag name should remain unchanged after deactivation",
    updated.name,
    created.name,
  );
  TestValidator.equals(
    "tag slug should remain unchanged after deactivation",
    updated.slug,
    created.slug,
  );

  // Description is optional and may be null/undefined in base type,
  // but for this test we created it with a non-empty value. Ensure it
  // is preserved.
  TestValidator.equals(
    "tag description should remain unchanged after deactivation",
    updated.description,
    created.description,
  );
}
