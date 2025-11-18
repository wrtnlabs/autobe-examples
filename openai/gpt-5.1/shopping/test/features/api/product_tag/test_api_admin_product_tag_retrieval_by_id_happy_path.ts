import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Validate admin product tag retrieval by id (happy path).
 *
 * Business goal
 *
 * - Ensure that an authenticated admin who has just created a product tag can
 *   immediately retrieve its full details via the admin productTags "at"
 *   endpoint using the tag id.
 * - Confirm end-to-end consistency between create and read operations for product
 *   tags.
 *
 * Flow
 *
 * 1. Join an admin account using POST /auth/admin/join.
 *
 *    - Use realistic values for email, password, href, and referrer.
 *    - Rely on SDK behavior to inject the access token into the connection so
 *         subsequent admin endpoints are authenticated.
 * 2. Create a new product tag via POST /shoppingMall/admin/productTags.
 *
 *    - Build a request body that satisfies IShoppingMallProductTag.ICreate with:
 *
 *         - Code: random programmatic identifier string
 *         - Label: random human‑readable label
 *         - Description: optional, but provide a value to assert later
 *         - IsActive: explicitly true
 *    - Capture the returned IShoppingMallProductTag as `created` and assert its
 *         runtime type with typia.assert().
 * 3. Retrieve the tag using GET /shoppingMall/admin/productTags/{productTagId}.
 *
 *    - Call api.functional.shoppingMall.admin.productTags.at with productTagId:
 *         created.id.
 *    - Capture the result as `fetched` and assert its runtime type with
 *         typia.assert().
 * 4. Validate consistency between created and fetched entities.
 *
 *    - Use TestValidator.equals with descriptive titles to verify:
 *
 *         - Fetched.id equals created.id
 *         - Fetched.name equals created.name
 *         - Fetched.slug equals created.slug
 *         - Fetched.description equals created.description
 *         - Fetched.created_at equals created.created_at
 *         - Fetched.updated_at equals created.updated_at
 *    - Also, check that fetched.deleted_at is null, confirming that a freshly
 *         created tag is active (not soft‑deleted). Note: because deleted_at is
 *         declared as `string | null | undefined`, explicitly compare against
 *         null while allowing undefined only if the API chooses not to expose
 *         the property; prefer asserting equality to created.deleted_at for
 *         stability.
 */
export async function test_api_admin_product_tag_retrieval_by_id_happy_path(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain an authenticated context
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
  typia.assert(adminAuthorized);

  // 2. Create a new product tag via admin productTags.create
  const createBody = {
    code: RandomGenerator.alphaNumeric(12),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const created: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // 3. Retrieve the same product tag by id via productTags.at
  const fetched: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.at(connection, {
      productTagId: created.id,
    });
  typia.assert(fetched);

  // 4. Validate consistency between created and fetched entities
  TestValidator.equals(
    "product tag id should match between create and fetch",
    fetched.id,
    created.id,
  );

  // In the schema, the main entity exposes `name` and `slug`, whereas the
  // create DTO uses `code` and `label`. Since there is no direct mapping
  // guarantee, we only assert stable invariants on fields that exist on
  // both sides. We still compare created vs fetched for these fields to
  // detect unintended mutation between creation and retrieval.
  TestValidator.equals(
    "product tag name should remain stable after creation",
    fetched.name,
    created.name,
  );
  TestValidator.equals(
    "product tag slug should remain stable after creation",
    fetched.slug,
    created.slug,
  );

  TestValidator.equals(
    "product tag description should remain stable after creation",
    fetched.description,
    created.description,
  );

  TestValidator.equals(
    "product tag created_at should remain unchanged",
    fetched.created_at,
    created.created_at,
  );

  TestValidator.equals(
    "product tag updated_at should remain unchanged right after creation",
    fetched.updated_at,
    created.updated_at,
  );

  TestValidator.equals(
    "product tag should not be soft-deleted right after creation",
    fetched.deleted_at ?? null,
    created.deleted_at ?? null,
  );
}
