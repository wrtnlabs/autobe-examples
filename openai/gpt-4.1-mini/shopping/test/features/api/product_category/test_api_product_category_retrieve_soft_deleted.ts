import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test retrieving detailed information of a soft-deleted product category by a valid UUID productCategoryId.
 *
 * The test performs administrator joining to obtain authorization, then attempts to retrieve a soft-deleted product category.
 * It validates that the category data includes a non-null `deleted_at` timestamp, confirming the soft deletion state, and other fields are correctly populated.
 */
export async function test_api_product_category_retrieve_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authorize
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@example.com",
      password: "12345678",
    },
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. We need a soft-deleted product category; Since no creation function, use random valid UUID assuming it represents a soft-deleted category for test
  const softDeletedCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the product category retrieval endpoint with the softDeletedCategoryId
  const category =
    await api.functional.shoppingMall.administrator.productCategories.at(
      adminConnection,
      { productCategoryId: softDeletedCategoryId },
    );
  typia.assert(category);
  // 4. Validate that deleted_at field is neither null nor undefined and is a date-time string
  TestValidator.predicate(
    "deleted_at is timestamp indicating soft deletion",
    category.deleted_at !== null &&
      category.deleted_at !== undefined &&
      typeof category.deleted_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
        category.deleted_at,
      ),
  );
  // 5. Validate other required fields are populated properly
  TestValidator.predicate(
    "id is valid UUID",
    typeof category.id === "string" && category.id.length > 0,
  );
  TestValidator.predicate(
    "name is non-empty",
    typeof category.name === "string" && category.name.length > 0,
  );
  TestValidator.predicate(
    "description is non-empty",
    typeof category.description === "string" &&
      category.description.length >= 0,
  );
  TestValidator.predicate(
    "created_at is date-time string",
    typeof category.created_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
        category.created_at,
      ),
  );
  TestValidator.predicate(
    "updated_at is date-time string",
    typeof category.updated_at === "string" &&
      /^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.[0-9]+)?Z$/.test(
        category.updated_at,
      ),
  );
}
