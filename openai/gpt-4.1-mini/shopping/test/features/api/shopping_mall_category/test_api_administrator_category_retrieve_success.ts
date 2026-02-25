import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_category_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins and obtains authorized adminConnection
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {});
  typia.assert(admin);
  // 2. Try unauthorized access with random categoryId (expect 401 Unauthorized)
  await TestValidator.httpError(
    "unauthorized access denies retrieval",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.categories.at(
        connection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 3. Retrieve any existing category with parentCategory to test nested structure
  // For test purposes, create or retrieve a valid categoryId
  // Since no creation utility, generate a random one (replace with known UUID)
  // We simulate valid categoryId by random uuid
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve category detail with adminConnection
  const category =
    await api.functional.shoppingMall.administrator.categories.at(
      adminConnection,
      {
        categoryId,
      },
    );
  typia.assert(category);
  // 5. Validate response id matches requested categoryId
  TestValidator.equals(
    "category id equals requested id",
    category.id,
    categoryId,
  );
  // 6. Validate required string properties
  TestValidator.predicate("category name non-empty", category.name.length > 0);
  TestValidator.predicate(
    "category description non-empty",
    category.description.length > 0,
  );
  // 7. Validate timestamps are ISO 8601 date-time strings
  const iso8601Regex =
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])T([01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z$/;
  TestValidator.predicate(
    "createdAt format",
    iso8601Regex.test(category.createdAt),
  );
  TestValidator.predicate(
    "updatedAt format",
    iso8601Regex.test(category.updatedAt),
  );
  // 8. deletedAt is either null or ISO 8601 date-time string
  TestValidator.predicate(
    "deletedAt is null or date string",
    category.deletedAt === null || iso8601Regex.test(category.deletedAt!),
  );
  // 9. Validate parentCategory if exists, else it must be null (explicitly)
  if (category.parentCategory === null) {
    TestValidator.predicate(
      "parentCategory is null as expected",
      category.parentCategory === null,
    );
  } else if (category.parentCategory !== undefined) {
    typia.assert(category.parentCategory);
    TestValidator.equals(
      "parentCategory id format",
      /^[0-9a-fA-F-]{36}$/.test(category.parentCategory.id),
      true,
    );
    TestValidator.predicate(
      "parentCategory name non-empty",
      category.parentCategory.name.length > 0,
    );
    TestValidator.predicate(
      "parentCategory description non-empty",
      category.parentCategory.description.length > 0,
    );
    TestValidator.predicate(
      "parentCategory deleted_at is null or date string",
      category.parentCategory.deleted_at === null ||
        iso8601Regex.test(category.parentCategory.deleted_at!),
    );
  }
}
