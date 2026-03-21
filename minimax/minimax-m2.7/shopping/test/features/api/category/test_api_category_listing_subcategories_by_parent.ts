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

export async function test_api_category_listing_subcategories_by_parent(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Admin1234!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: "http://localhost:3000" as string & tags.Format<"uri">,
      referrer: "http://localhost:3000" as string & tags.Format<"uri">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Query categories filtered by parentId
  // Test that the endpoint accepts parentId filter and returns properly structured response
  const parentId = typia.random<string & tags.Format<"uuid">>();
  const subcategoriesPage =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        parentId: parentId,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(subcategoriesPage);
  // Validate response structure
  TestValidator.equals(
    "should have pagination metadata",
    subcategoriesPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "should have data array",
    Array.isArray(subcategoriesPage.data),
    true,
  );
  TestValidator.predicate(
    "pagination should have current page",
    subcategoriesPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination should have records count",
    subcategoriesPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination should have pages count",
    subcategoriesPage.pagination.pages >= 0,
  );
  // Step 3: Query categories without parentId filter (null/undefined) - returns root categories
  const rootCategoriesPage =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {} satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(rootCategoriesPage);
  // Validate response structure for root categories
  TestValidator.equals(
    "root page should have pagination",
    rootCategoriesPage.pagination !== null,
    true,
  );
  TestValidator.equals(
    "root page should have data array",
    Array.isArray(rootCategoriesPage.data),
    true,
  );
  // Step 4: Validate that if any category has subcategories, the parent relationship is correct
  if (subcategoriesPage.data.length > 0) {
    const subcategory = subcategoriesPage.data[0];
    if (subcategory.parent) {
      TestValidator.equals(
        "subcategory parent id matches filter",
        subcategory.parent.id,
        parentId,
      );
    }
  }
  // Step 5: Test with pagination parameters
  const paginatedPage =
    await api.functional.ecommerceMall.admin.categories.index(adminConnection, {
      body: {
        parentId: parentId,
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallCategory.IRequest,
    });
  typia.assert(paginatedPage);
  TestValidator.equals(
    "limit should be respected",
    paginatedPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "current page should be 1",
    paginatedPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    paginatedPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "data count should not exceed limit",
    paginatedPage.data.length <= 10,
  );
}
