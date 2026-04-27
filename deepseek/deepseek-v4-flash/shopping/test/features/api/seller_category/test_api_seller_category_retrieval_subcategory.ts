import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that an authenticated seller can retrieve a subcategory and verify it correctly references its parent category.
 *
 * Validates the complete flow of administrator category hierarchy creation (top-level parent + subcategory), seller authentication, and category retrieval by the seller. Ensures that the subcategory response correctly references its parent through the `parent` field with all expected properties.
 *
 * Special attention is given to verifying that the parent category in the response has its own `parent` set to `null` (confirming it is a top-level category) and that both categories have `deleted_at` as `null` (both are active).
 *
 * 1. Administrator registers an account.
 * 2. Administrator creates a top-level parent category named "Electronics".
 * 3. Administrator creates a subcategory "Smartphones" under the parent.
 * 4. Seller registers an account.
 * 5. Seller retrieves the subcategory by its ID.
 * 6. Validates the response includes correct subcategory details and parent reference.
 */
export async function test_api_seller_category_retrieval_subcategory(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create parent category
  const parentCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices",
        } satisfies IECommerceMallCategory.ICreate,
      },
    );
  typia.assert(parentCategory);
  // 3. Create subcategory under parent
  const subcategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: parentCategory.id,
        } satisfies IECommerceMallCategory.ICreate,
      },
    );
  typia.assert(subcategory);
  // 4. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  // 5. Seller retrieves the subcategory
  const retrieved = await api.functional.eCommerceMall.seller.categories.at(
    sellerConnection,
    {
      categoryId: subcategory.id,
    },
  );
  typia.assert(retrieved);
  // 6. Validate subcategory fields
  TestValidator.equals("id matches", retrieved.id, subcategory.id);
  TestValidator.equals("name matches", retrieved.name, "Smartphones");
  TestValidator.equals(
    "description matches",
    retrieved.description,
    "Mobile phones and accessories",
  );
  TestValidator.predicate("parent is not null", retrieved.parent !== null);
  // Validate parent reference
  const parent = retrieved.parent!;
  TestValidator.equals("parent id matches", parent.id, parentCategory.id);
  TestValidator.equals("parent name matches", parent.name, "Electronics");
  TestValidator.equals(
    "parent description matches",
    parent.description,
    "Electronic devices",
  );
  TestValidator.predicate(
    "parent has no parent (top-level)",
    parent.parent === null,
  );
  TestValidator.predicate("parent is not deleted", parent.deleted_at === null);
  // Validate category is active
  TestValidator.predicate(
    "subcategory is not deleted",
    retrieved.deleted_at === null,
  );
}
