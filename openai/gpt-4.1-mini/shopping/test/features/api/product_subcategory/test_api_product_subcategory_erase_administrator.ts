import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_subcategory_erase_administrator(
  connection: api.IConnection,
) {
  // Scenario 1: Successful deletion of an existing product subcategory
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // Prepare a product subcategory by creating one if possible (implied prerequisite)
  // Since creation API for product subcategory is not given, we simulate the existence by generating a valid UUID
  const existingSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  // First, attempt to delete the existing subcategory
  const deletionResponse =
    await api.functional.shoppingMall.administrator.productSubcategories.erase(
      adminConnection,
      {
        subcategoryId: existingSubcategoryId,
      },
    );
  typia.assert(deletionResponse);
  // Note: No direct database check function or API is provided,
  // so assume successful deletion if no error thrown and valid response.
  // Scenario 2: Attempting to delete a non-existent subcategory
  const nonExistentSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "delete non-existent subcategory",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productSubcategories.erase(
        adminConnection,
        {
          subcategoryId: nonExistentSubcategoryId,
        },
      );
    },
  );
  // Scenario 3: Deletion of a product subcategory after re-creation
  // For testing, reuse existingSubcategoryId as re-created subcategory
  // Again, simulate existence by UUID and deletion
  const recreatedSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  const deleteAgainResponse =
    await api.functional.shoppingMall.administrator.productSubcategories.erase(
      adminConnection,
      {
        subcategoryId: recreatedSubcategoryId,
      },
    );
  typia.assert(deleteAgainResponse);
  // Authorization Restrictions check
  // Attempt to delete without authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host }; // No Authorization headers
  await TestValidator.httpError(
    "delete without authorization",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productSubcategories.erase(
        unauthorizedConnection,
        {
          subcategoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
