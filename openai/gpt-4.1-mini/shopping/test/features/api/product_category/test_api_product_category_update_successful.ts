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

export async function test_api_product_category_update_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd12345",
    },
  });
  typia.assert(adminAuth);
  // 2. Prepare an existing product category
  //    Since no creation utility is given, mimic an existing category by creating and then updating
  //    Here we simulate by generating a random UUID for categoryCategoryId
  const existingCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3. Send PUT request with unique new name and valid description
  const newName = `UpdatedCategory_${RandomGenerator.alphabets(8)}`;
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const body: IShoppingMallProductCategory.IUpdate = {
    name: newName,
    description: newDescription,
  };
  const updatedCategory =
    await api.functional.shoppingMall.administrator.product_categories.update(
      adminConnection,
      {
        categoryCategoryId: existingCategoryId,
        body,
      },
    );
  typia.assert(updatedCategory);
  // 4. Verify updated category fields
  TestValidator.equals(
    "category id unchanged",
    updatedCategory.id,
    existingCategoryId,
  );
  TestValidator.equals("category name updated", updatedCategory.name, newName);
  TestValidator.equals(
    "category description updated",
    updatedCategory.description,
    newDescription,
  );
  TestValidator.predicate(
    "category createdAt is valid",
    typeof updatedCategory.created_at === "string" &&
      updatedCategory.created_at.length > 0,
  );
  TestValidator.predicate(
    "category updatedAt is valid",
    typeof updatedCategory.updated_at === "string" &&
      updatedCategory.updated_at.length > 0,
  );
  // 5. Confirm optional deleted_at is null or a date string
  if (
    updatedCategory.deleted_at !== null &&
    updatedCategory.deleted_at !== undefined
  )
    TestValidator.predicate(
      "deletedAt is a valid date-time string",
      typeof updatedCategory.deleted_at === "string" &&
        updatedCategory.deleted_at.length > 0,
    );
  // 6. Validate audit log recording
  //    Assuming audit log API is not provided, we trust the operation succeeded if update succeeded
  // 7. Edge case: Subcategories remain unaffected
  //    Since no subcategory detail is given, we cannot validate this here explicitly
}
