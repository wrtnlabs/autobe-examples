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

export async function test_api_administrator_product_category_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as an administrator by joining the system
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(
    adminConnection,
    {},
  );
  // 2) Prepare a valid product category UUID
  // Since creation or list utilities are absent, generate a random UUID
  const categoryCategoryId = typia.random<string & tags.Format<"uuid">>();
  // 3) Request detailed information for the valid product category UUID
  const category =
    await api.functional.shoppingMall.administrator.product_categories.at(
      adminConnection,
      { categoryCategoryId },
    );
  // 4) Validate that the response matches the IShoppingMallProductCategory schema
  typia.assert(category);
  // 5) Confirm the category is not soft deleted
  TestValidator.predicate(
    "category is not soft deleted",
    category.deleted_at === null || category.deleted_at === undefined,
  );
  // 6) Confirm the response includes mandatory fields
  TestValidator.predicate(
    "category has valid name",
    typeof category.name === "string" && category.name.length > 0,
  );
  TestValidator.predicate(
    "category has valid description",
    typeof category.description === "string",
  );
  TestValidator.predicate(
    "category has valid created_at",
    typeof category.created_at === "string" && category.created_at.length > 0,
  );
  TestValidator.predicate(
    "category has valid updated_at",
    typeof category.updated_at === "string" && category.updated_at.length > 0,
  );
}
