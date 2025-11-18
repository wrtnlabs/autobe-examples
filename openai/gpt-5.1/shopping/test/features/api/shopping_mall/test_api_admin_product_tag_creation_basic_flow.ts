import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Register a fresh administrator and obtain authorized context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare a meaningful product tag creation payload
  const suffix = RandomGenerator.alphaNumeric(8).toLowerCase();
  const baseCode = `summer-sale-${suffix}`;
  const label = `Summer Sale ${suffix}`;

  const tagCreateBody = {
    code: baseCode,
    label,
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 8,
    }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  // 3. Call product tag creation endpoint as the authenticated admin
  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert<IShoppingMallProductTag>(createdTag);

  // 4. Business-level validations

  // 4-1. id should be a non-empty UUID-like string (typia already enforces
  // UUID format, we only assert non-empty for business sanity)
  TestValidator.predicate(
    "created tag id must be a non-empty string",
    typeof createdTag.id === "string" && createdTag.id.length > 0,
  );

  // 4-2. name should reflect the submitted label
  TestValidator.equals(
    "created tag name should equal submitted label",
    createdTag.name,
    label,
  );

  // 4-3. slug should be lowercase, without spaces, and non-empty
  TestValidator.predicate(
    "created tag slug must be lowercase, non-empty, and without spaces",
    typeof createdTag.slug === "string" &&
      createdTag.slug.length > 0 &&
      createdTag.slug === createdTag.slug.toLowerCase() &&
      createdTag.slug.indexOf(" ") === -1,
  );

  // 4-4. created_at and updated_at must be non-empty strings
  TestValidator.predicate(
    "created_at must be a non-empty string",
    typeof createdTag.created_at === "string" &&
      createdTag.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be a non-empty string",
    typeof createdTag.updated_at === "string" &&
      createdTag.updated_at.length > 0,
  );

  // 4-5. deleted_at should be null or undefined for an active tag
  TestValidator.predicate(
    "deleted_at must be null or undefined for a newly created active tag",
    createdTag.deleted_at === null || createdTag.deleted_at === undefined,
  );

  // 4-6. isActive should be true when provided as true in the create DTO
  // Note: isActive is not part of IShoppingMallProductTag; it only exists in
  // IShoppingMallProductTag.ICreate. We cannot assert it on the response
  // object, so we limit ourselves to checking fields present in the DTO.

  // 5. Re-assert stability on the createdTag object (optional extra safety)
  typia.assert<IShoppingMallProductTag>(createdTag);
}
