import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_creation_with_optional_fields(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authenticated admin context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a product tag with all optional fields explicitly provided.
  const codeActive = `limited-edition-${RandomGenerator.alphaNumeric(8)}`;
  const labelActive = "Limited Edition 2025";
  const descriptionActive = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });

  const createActiveBody = {
    code: codeActive,
    label: labelActive,
    description: descriptionActive,
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const activeTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createActiveBody,
    });
  typia.assert(activeTag);

  // 3. Validate mapping and persistence for the active tag.
  // Business mapping expectations:
  // - name should reflect the human-readable label
  TestValidator.equals(
    "active tag name matches label",
    activeTag.name,
    labelActive,
  );

  // - description field should equal the submitted description when provided
  TestValidator.equals(
    "active tag description matches submitted description",
    activeTag.description ?? null,
    descriptionActive,
  );

  // - slug should be a URL-friendly form; we at least ensure it is non-empty.
  TestValidator.predicate(
    "active tag slug is non-empty",
    activeTag.slug.length > 0,
  );

  // Active state: infer active-ness from deleted_at being null.
  TestValidator.equals(
    "active tag has null deleted_at (active)",
    activeTag.deleted_at ?? null,
    null,
  );

  // created_at and updated_at should be very close on first insert; parse as Date and compare.
  const createdAtActive = new Date(activeTag.created_at).getTime();
  const updatedAtActive = new Date(activeTag.updated_at).getTime();
  const diffMillisActive = Math.abs(updatedAtActive - createdAtActive);

  TestValidator.predicate(
    "updated_at is close to created_at for active tag",
    diffMillisActive <= 5 * 60 * 1000,
  );

  // 4. Optionally create a second tag with isActive set to false and validate
  // field persistence for an "inactive" tag.
  const codeInactive = `inactive-tag-${RandomGenerator.alphaNumeric(8)}`;
  const labelInactive = "Inactive Tag 2025";
  const descriptionInactive = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  const createInactiveBody = {
    code: codeInactive,
    label: labelInactive,
    description: descriptionInactive,
    isActive: false,
  } satisfies IShoppingMallProductTag.ICreate;

  const inactiveTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createInactiveBody,
    });
  typia.assert(inactiveTag);

  // Ensure mapping and optional fields persistence are consistent for the inactive tag.
  TestValidator.equals(
    "inactive tag name matches label",
    inactiveTag.name,
    labelInactive,
  );

  TestValidator.equals(
    "inactive tag description matches submitted description",
    inactiveTag.description ?? null,
    descriptionInactive,
  );

  const createdAtInactive = new Date(inactiveTag.created_at).getTime();
  const updatedAtInactive = new Date(inactiveTag.updated_at).getTime();
  const diffMillisInactive = Math.abs(updatedAtInactive - createdAtInactive);

  TestValidator.predicate(
    "updated_at is close to created_at for inactive tag",
    diffMillisInactive <= 5 * 60 * 1000,
  );
}
