import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_category_listing_root_categories(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // Step 2: Call admin categories endpoint with parentId: undefined to get root categories
  const response = await api.functional.ecommerceMall.admin.categories.index(
    adminConnection,
    {
      body: {
        parentId: undefined,
        page: 1,
        limit: 20,
      } satisfies IEcommerceMallCategory.IRequest,
    },
  );
  typia.assert(response);
  // Step 3: Validate pagination metadata structure
  TestValidator.equals("pagination exists", response.pagination !== null, true);
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current > 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Step 4: Validate data array exists
  TestValidator.equals("data array exists", Array.isArray(response.data), true);
  // Step 5: Validate each root category has correct structure
  for (const category of response.data) {
    typia.assert(category);
    // Validate id is UUID format
    TestValidator.predicate(
      "category has valid id",
      /^[0-9a-f-]{36}$/i.test(category.id),
    );
    // Validate name exists
    TestValidator.equals(
      "category has name",
      category.name !== undefined,
      true,
    );
    // Validate parent is null for root categories
    TestValidator.equals("root category parent is null", category.parent, null);
  }
}