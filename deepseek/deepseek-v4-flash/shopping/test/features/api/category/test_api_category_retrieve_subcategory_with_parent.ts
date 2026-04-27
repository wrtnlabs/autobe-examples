import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_super_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_super_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that a super administrator can retrieve a subcategory with the parent relationship populated.
 *
 * Validates the two-level category hierarchy retrieval by creating a top-level category, then a subcategory under it. The subcategory is fetched via the GET endpoint, and the response is checked to ensure the parent field contains the top-level category's summary with matching id.
 *
 * 1. Authenticate as a super administrator using the join endpoint.
 * 2. Create a top-level category (no parent_id).
 * 3. Create a subcategory with the top-level category's id as parent_id.
 * 4. Retrieve the subcategory by its id.
 * 5. Validate the parent field is populated with the correct parent summary.
 */
export async function test_api_category_retrieve_subcategory_with_parent(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_administrator_join(adminConnection, {});
  typia.assert(auth);
  // 2. Create a top-level category (no parent_id)
  const parentCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices and gadgets",
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(parentCategory);
  // 3. Create a subcategory under the top-level category
  const subCategory =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones and accessories",
          parent_id: parentCategory.id,
        } satisfies DeepPartial<IECommerceMallCategory.ICreate>,
      },
    );
  typia.assert(subCategory);
  // 4. Retrieve the subcategory by ID via GET endpoint
  const retrieved =
    await api.functional.eCommerceMall.superAdministrator.categories.at(
      adminConnection,
      {
        categoryId: subCategory.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate parent relationship
  TestValidator.equals("subcategory id", retrieved.id, subCategory.id);
  TestValidator.predicate("parent is populated", retrieved.parent !== null);
  TestValidator.equals(
    "parent category id",
    retrieved.parent!.id,
    parentCategory.id,
  );
}
