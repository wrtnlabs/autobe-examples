import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategory";
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

export async function test_api_category_list_pagination_without_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator using join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "password123",
      },
    });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Request paginated category list with default parameters (no filters)
  const defaultRequest: IShoppingMallCategory.IRequest = {
    page: 1,
    limit: 20,
  };
  const page1Response: IPageIShoppingMallCategory.ISummary =
    await api.functional.shoppingMall.administrator.categories.index(
      adminConnection,
      { body: defaultRequest },
    );
  typia.assert(page1Response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    page1Response.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", page1Response.pagination.limit === 20);
  TestValidator.predicate(
    "records non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    page1Response.pagination.pages >= 0,
  );
  // 4. Validate categories in data: should have deleted_at === null
  for (const category of page1Response.data) {
    typia.assert(category);
    TestValidator.equals(
      "category deleted_at is null",
      category.deleted_at,
      null,
    );
    TestValidator.predicate(
      "category has id",
      typeof category.id === "string" && category.id.length > 0,
    );
    TestValidator.predicate(
      "category has name",
      typeof category.name === "string" && category.name.length > 0,
    );
    TestValidator.predicate(
      "category has description",
      typeof category.description === "string",
    );
    if (category.parentCategory !== null) {
      typia.assert(category.parentCategory);
      TestValidator.predicate(
        "parentCategory has id",
        typeof category.parentCategory.id === "string" &&
          category.parentCategory.id.length > 0,
      );
      TestValidator.predicate(
        "parentCategory has name",
        typeof category.parentCategory.name === "string" &&
          category.parentCategory.name.length > 0,
      );
    }
  }
  // 5. Test edge case: No categories exist - Expect empty data array and zero page info
  // Because this depends on existing database state, we can at least check logically
  // If there are no records, data should be empty, pages should be 0
  if (page1Response.pagination.records === 0) {
    TestValidator.equals("no data count is zero", page1Response.data.length, 0);
    TestValidator.equals(
      "pages count is zero",
      page1Response.pagination.pages,
      0,
    );
  }
  // 6. Test edge case: Many categories exist - test pagination mechanics
  if (page1Response.pagination.records > 0) {
    const limit10Request: IShoppingMallCategory.IRequest = {
      page: 2,
      limit: 10,
    };
    const page2Response: IPageIShoppingMallCategory.ISummary =
      await api.functional.shoppingMall.administrator.categories.index(
        adminConnection,
        { body: limit10Request },
      );
    typia.assert(page2Response);
    TestValidator.predicate(
      "page 2 current page",
      page2Response.pagination.current === 2 ||
        page2Response.pagination.pages === 0,
    );
    TestValidator.predicate("limit 10", page2Response.pagination.limit === 10);
  }
}
