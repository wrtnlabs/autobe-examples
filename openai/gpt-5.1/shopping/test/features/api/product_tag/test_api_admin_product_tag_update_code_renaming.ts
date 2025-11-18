import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_update_code_renaming(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional fields ip can be omitted; href and referrer are required
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create two baseline product tags with distinct codes
  const firstTagCreateBody = {
    code: "clearance-2025",
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const firstTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: firstTagCreateBody,
    });
  typia.assert(firstTag);

  const secondTagCreateBody = {
    code: "summer-collection-2025",
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const secondTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: secondTagCreateBody,
    });
  typia.assert(secondTag);

  // Snapshot immutable baseline fields for later comparison
  const originalFirstTagId = firstTag.id;
  const originalFirstTagName = firstTag.name;
  const originalFirstTagSlug = firstTag.slug;
  const originalFirstTagDescription = firstTag.description ?? null;

  // 3. Perform a successful code rename for the first tag
  const newCodeForFirstTag = "clearance-2026";
  const firstTagUpdateBody = {
    code: newCodeForFirstTag,
    // All other fields omitted to ensure they remain unchanged
  } satisfies IShoppingMallProductTag.IUpdate;

  const updatedFirstTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.update(connection, {
      productTagId: firstTag.id,
      body: firstTagUpdateBody,
    });
  typia.assert(updatedFirstTag);

  // 4. Validate that id is stable and non-code fields are preserved
  TestValidator.equals(
    "product tag id must remain the same after code rename",
    updatedFirstTag.id,
    originalFirstTagId,
  );

  TestValidator.equals(
    "product tag name must remain unchanged when only code is updated",
    updatedFirstTag.name,
    originalFirstTagName,
  );

  TestValidator.equals(
    "product tag slug must remain unchanged when only code is updated",
    updatedFirstTag.slug,
    originalFirstTagSlug,
  );

  TestValidator.equals(
    "product tag description must remain unchanged when only code is updated",
    updatedFirstTag.description ?? null,
    originalFirstTagDescription,
  );

  // updated_at should be equal or later than original created_at in normal flows
  TestValidator.predicate(
    "updated_at should not be earlier than created_at after update",
    () =>
      new Date(updatedFirstTag.updated_at).getTime() >=
      new Date(updatedFirstTag.created_at).getTime(),
  );

  // 5. Attempt a duplicate code update on the second tag and expect failure
  const duplicateCodeUpdateBody = {
    code: newCodeForFirstTag,
  } satisfies IShoppingMallProductTag.IUpdate;

  await TestValidator.error(
    "duplicate tag code update must be rejected by backend",
    async () => {
      await api.functional.shoppingMall.admin.productTags.update(connection, {
        productTagId: secondTag.id,
        body: duplicateCodeUpdateBody,
      });
    },
  );
}
