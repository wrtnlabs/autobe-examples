import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test that a customer can retrieve a top-level category by its ID.
 *
 * Validates the complete flow from administrator category creation through customer retrieval. An administrator joins the platform and creates a top-level category (with no parent_id). A customer then joins and retrieves the category via GET /eCommerceMall/customer/categories/{categoryId}. Asserts that the response fields match the created category, that the parent field is null (confirming it is a top-level category), that deleted_at is null, and that the timestamps are valid date-time strings.
 *
 * 1. Administrator joins the platform.
 * 2. Administrator creates a top-level category (parent is omitted).
 * 3. Customer joins the platform.
 * 4. Customer retrieves the category by its ID.
 * 5. Validates response matches expected values.
 */
export async function test_api_category_retrieval_top_level_by_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Create a top-level category (no parent_id)
  const category: IECommerceMallCategory =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 3. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Retrieve the category by ID as customer
  const retrieved: IECommerceMallCategory =
    await api.functional.eCommerceMall.customer.categories.at(
      customerConnection,
      {
        categoryId: category.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate response
  TestValidator.equals("category id matches", retrieved.id, category.id);
  TestValidator.equals("category name matches", retrieved.name, category.name);
  TestValidator.equals(
    "category description matches",
    retrieved.description,
    category.description,
  );
  TestValidator.predicate(
    "parent is null for top-level",
    retrieved.parent === null,
  );
  TestValidator.predicate("deleted_at is null", retrieved.deleted_at === null);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(retrieved.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(retrieved.updated_at).getTime()),
  );
}
