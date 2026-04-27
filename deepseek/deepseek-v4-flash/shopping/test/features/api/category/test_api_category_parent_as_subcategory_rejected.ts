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
 * Test that the two-level hierarchy business rule is enforced: attempting to create a category using a subcategory as its parent is rejected because subcategories cannot themselves be parents.
 *
 * This test validates the category hierarchy enforcement logic in the e-commerce platform. First, a top-level category ("Electronics") is created, followed by a subcategory ("Smartphones") under it. Then, an attempt to create a third category using the subcategory as its parent is expected to fail.
 *
 * The system only allows top-level categories (those with no parent) to have subcategories. Subcategories cannot themselves be parents. A validation error must be returned, and no category record should be created for the attempted third category.
 *
 * 1. Join as a superAdministrator to obtain authentication credentials.
 * 2. Create a top-level category "Electronics".
 * 3. Create a subcategory "Smartphones" under "Electronics".
 * 4. Attempt to create "iPhone Cases" using "Smartphones" as parent — expect rejection with an HTTP error.
 */
export async function test_api_category_parent_as_subcategory_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(authorized);
  // 2. Create a top-level category "Electronics"
  const electronics =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices",
          parent_id: null,
        },
      },
    );
  typia.assert(electronics);
  // 3. Create a subcategory "Smartphones" under "Electronics"
  const smartphones =
    await generate_random_e_commerce_mall_super_administrator_categories_create(
      superAdminConnection,
      {
        body: {
          name: "Smartphones",
          description: "Mobile phones",
          parent_id: electronics.id,
        },
      },
    );
  typia.assert(smartphones);
  // 4. Attempt to create a category using "Smartphones" (a subcategory) as parent — should be rejected
  await TestValidator.httpError(
    "subcategory as parent rejected",
    [400, 422],
    async () => {
      await generate_random_e_commerce_mall_super_administrator_categories_create(
        superAdminConnection,
        {
          body: {
            name: "iPhone Cases",
            description: "Phone cases",
            parent_id: smartphones.id,
          },
        },
      );
    },
  );
}
